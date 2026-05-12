#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, log, Address, Env, String,
    Vec,
};

// ─── Error Types ──────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    /// The payment request ID does not exist
    InvalidPaymentId = 1,
    /// The caller is not authorized to perform this action
    Unauthorized = 2,
    /// The payment request has already been fulfilled
    AlreadyFulfilled = 3,
    /// The payment request has already been cancelled
    AlreadyCancelled = 4,
    /// The payment amount must be greater than zero
    InvalidAmount = 5,
}

// ─── Data Types ───────────────────────────────────────────────────────────────

/// Status of a payment request
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum PaymentStatus {
    Pending = 0,
    Fulfilled = 1,
    Cancelled = 2,
}

/// A tracked payment request stored on-chain
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentRequest {
    pub id: u64,
    pub creator: Address,
    pub recipient: Address,
    pub amount: i128,
    pub memo: String,
    pub status: PaymentStatus,
    pub created_at: u64,
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    /// Global counter for payment request IDs
    RequestCount,
    /// Individual payment request by ID
    Request(u64),
    /// List of payment request IDs for a given user address
    UserRequests(Address),
}

// ─── TTL Constants ────────────────────────────────────────────────────────────

/// Minimum TTL threshold before extending (in ledgers, ~50 ledgers ≈ 250s)
const TTL_THRESHOLD: u32 = 1000;
/// TTL to extend to when threshold is reached (in ledgers, ~30 days)
const TTL_EXTEND: u32 = 518_400;

// ─── Events ───────────────────────────────────────────────────────────────────

#[contractevent(topics = ["payment", "created"], data_format = "single-value")]
struct RequestCreatedEvent {
    id: u64,
}

#[contractevent(topics = ["payment", "fulfilled"], data_format = "single-value")]
struct RequestFulfilledEvent {
    id: u64,
}

#[contractevent(topics = ["payment", "cancelled"], data_format = "single-value")]
struct RequestCancelledEvent {
    id: u64,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct PaymentTrackerContract;

#[contractimpl]
impl PaymentTrackerContract {
    /// Creates a new tracked payment request.
    ///
    /// # Arguments
    /// * `creator` - The address creating the request (must authorize)
    /// * `recipient` - The intended recipient of the payment
    /// * `amount` - The amount in stroops (must be > 0)
    /// * `memo` - A short memo/description for the payment
    ///
    /// # Returns
    /// The unique payment request ID
    pub fn create_request(
        env: Env,
        creator: Address,
        recipient: Address,
        amount: i128,
        memo: String,
    ) -> Result<u64, ContractError> {
        // Require the creator to authorize this call
        creator.require_auth();

        // Validate amount
        if amount <= 0 {
            return Err(ContractError::InvalidAmount);
        }

        // Get and increment the request counter
        let mut count: u64 = env
            .storage()
            .instance()
            .get(&DataKey::RequestCount)
            .unwrap_or(0);
        count += 1;

        // Create the payment request
        let request = PaymentRequest {
            id: count,
            creator: creator.clone(),
            recipient: recipient.clone(),
            amount,
            memo,
            status: PaymentStatus::Pending,
            created_at: env.ledger().timestamp(),
        };

        // Store the request
        env.storage()
            .persistent()
            .set(&DataKey::Request(count), &request);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Request(count), TTL_THRESHOLD, TTL_EXTEND);

        // Update the counter
        env.storage()
            .instance()
            .set(&DataKey::RequestCount, &count);

        // Add to creator's request list
        Self::add_user_request(&env, &creator, count);

        // Add to recipient's request list (so they can see incoming requests)
        Self::add_user_request(&env, &recipient, count);

        // Extend instance TTL
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND);

        log!(&env, "Payment request created: id={}", count);

        // Publish event
        RequestCreatedEvent { id: count }.publish(&env);

        Ok(count)
    }

    /// Marks a payment request as fulfilled.
    ///
    /// # Arguments
    /// * `payment_id` - The ID of the payment request
    /// * `fulfiller` - The address fulfilling the request (must be the recipient)
    pub fn fulfill_request(
        env: Env,
        payment_id: u64,
        fulfiller: Address,
    ) -> Result<(), ContractError> {
        fulfiller.require_auth();

        let mut request: PaymentRequest = env
            .storage()
            .persistent()
            .get(&DataKey::Request(payment_id))
            .ok_or(ContractError::InvalidPaymentId)?;

        // Only the recipient can fulfill
        if request.recipient != fulfiller {
            return Err(ContractError::Unauthorized);
        }

        // Check status
        if request.status == PaymentStatus::Fulfilled {
            return Err(ContractError::AlreadyFulfilled);
        }
        if request.status == PaymentStatus::Cancelled {
            return Err(ContractError::AlreadyCancelled);
        }

        // Update status
        request.status = PaymentStatus::Fulfilled;
        env.storage()
            .persistent()
            .set(&DataKey::Request(payment_id), &request);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Request(payment_id), TTL_THRESHOLD, TTL_EXTEND);

        log!(&env, "Payment request fulfilled: id={}", payment_id);

        RequestFulfilledEvent { id: payment_id }.publish(&env);

        Ok(())
    }

    /// Cancels a pending payment request.
    ///
    /// # Arguments
    /// * `payment_id` - The ID of the payment request
    /// * `caller` - The address cancelling the request (must be the creator)
    pub fn cancel_request(
        env: Env,
        payment_id: u64,
        caller: Address,
    ) -> Result<(), ContractError> {
        caller.require_auth();

        let mut request: PaymentRequest = env
            .storage()
            .persistent()
            .get(&DataKey::Request(payment_id))
            .ok_or(ContractError::InvalidPaymentId)?;

        // Only the creator can cancel
        if request.creator != caller {
            return Err(ContractError::Unauthorized);
        }

        // Check status
        if request.status == PaymentStatus::Fulfilled {
            return Err(ContractError::AlreadyFulfilled);
        }
        if request.status == PaymentStatus::Cancelled {
            return Err(ContractError::AlreadyCancelled);
        }

        // Update status
        request.status = PaymentStatus::Cancelled;
        env.storage()
            .persistent()
            .set(&DataKey::Request(payment_id), &request);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Request(payment_id), TTL_THRESHOLD, TTL_EXTEND);

        log!(&env, "Payment request cancelled: id={}", payment_id);

        RequestCancelledEvent { id: payment_id }.publish(&env);

        Ok(())
    }

    /// Retrieves a specific payment request by ID.
    pub fn get_request(env: Env, payment_id: u64) -> Result<PaymentRequest, ContractError> {
        let request: PaymentRequest = env
            .storage()
            .persistent()
            .get(&DataKey::Request(payment_id))
            .ok_or(ContractError::InvalidPaymentId)?;

        // Bump TTL on read
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Request(payment_id), TTL_THRESHOLD, TTL_EXTEND);

        Ok(request)
    }

    /// Returns all payment request IDs associated with a given address.
    pub fn get_requests_by_user(env: Env, address: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::UserRequests(address))
            .unwrap_or(Vec::new(&env))
    }

    /// Returns the total number of payment requests created.
    pub fn get_request_count(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::RequestCount)
            .unwrap_or(0)
    }

    // ─── Internal Helpers ─────────────────────────────────────────────────

    /// Adds a payment request ID to a user's list of requests.
    fn add_user_request(env: &Env, address: &Address, request_id: u64) {
        let key = DataKey::UserRequests(address.clone());
        let mut ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new(env));

        ids.push_back(request_id);

        env.storage().persistent().set(&key, &ids);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND);
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Env;

    fn setup_env() -> (Env, PaymentTrackerContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(PaymentTrackerContract, ());
        let client = PaymentTrackerContractClient::new(&env, &contract_id);
        (env, client)
    }

    #[test]
    fn test_create_request() {
        let (env, client) = setup_env();
        let creator = Address::generate(&env);
        let recipient = Address::generate(&env);
        let memo = String::from_str(&env, "Test payment");

        let id = client.create_request(&creator, &recipient, &1_000_000_i128, &memo);
        assert_eq!(id, 1);

        let request = client.get_request(&1);
        assert_eq!(request.creator, creator);
        assert_eq!(request.recipient, recipient);
        assert_eq!(request.amount, 1_000_000_i128);
        assert_eq!(request.status, PaymentStatus::Pending);
    }

    #[test]
    fn test_create_multiple_requests() {
        let (env, client) = setup_env();
        let creator = Address::generate(&env);
        let recipient = Address::generate(&env);
        let memo = String::from_str(&env, "Payment");

        let id1 = client.create_request(&creator, &recipient, &100_i128, &memo);
        let id2 = client.create_request(&creator, &recipient, &200_i128, &memo);
        let id3 = client.create_request(&creator, &recipient, &300_i128, &memo);

        assert_eq!(id1, 1);
        assert_eq!(id2, 2);
        assert_eq!(id3, 3);
        assert_eq!(client.get_request_count(), 3);
    }

    #[test]
    fn test_fulfill_request() {
        let (env, client) = setup_env();
        let creator = Address::generate(&env);
        let recipient = Address::generate(&env);
        let memo = String::from_str(&env, "Fulfill test");

        client.create_request(&creator, &recipient, &500_i128, &memo);
        client.fulfill_request(&1, &recipient);

        let request = client.get_request(&1);
        assert_eq!(request.status, PaymentStatus::Fulfilled);
    }

    #[test]
    fn test_cancel_request() {
        let (env, client) = setup_env();
        let creator = Address::generate(&env);
        let recipient = Address::generate(&env);
        let memo = String::from_str(&env, "Cancel test");

        client.create_request(&creator, &recipient, &500_i128, &memo);
        client.cancel_request(&1, &creator);

        let request = client.get_request(&1);
        assert_eq!(request.status, PaymentStatus::Cancelled);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #2)")]
    fn test_fulfill_unauthorized() {
        let (env, client) = setup_env();
        let creator = Address::generate(&env);
        let recipient = Address::generate(&env);
        let attacker = Address::generate(&env);
        let memo = String::from_str(&env, "Auth test");

        client.create_request(&creator, &recipient, &500_i128, &memo);
        // Attacker tries to fulfill — should fail with Unauthorized
        client.fulfill_request(&1, &attacker);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #2)")]
    fn test_cancel_unauthorized() {
        let (env, client) = setup_env();
        let creator = Address::generate(&env);
        let recipient = Address::generate(&env);
        let memo = String::from_str(&env, "Auth test");

        client.create_request(&creator, &recipient, &500_i128, &memo);
        // Recipient tries to cancel — should fail with Unauthorized
        client.cancel_request(&1, &recipient);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #3)")]
    fn test_double_fulfill() {
        let (env, client) = setup_env();
        let creator = Address::generate(&env);
        let recipient = Address::generate(&env);
        let memo = String::from_str(&env, "Double fulfill");

        client.create_request(&creator, &recipient, &500_i128, &memo);
        client.fulfill_request(&1, &recipient);
        // Second fulfillment should fail
        client.fulfill_request(&1, &recipient);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #4)")]
    fn test_double_cancel() {
        let (env, client) = setup_env();
        let creator = Address::generate(&env);
        let recipient = Address::generate(&env);
        let memo = String::from_str(&env, "Double cancel");

        client.create_request(&creator, &recipient, &500_i128, &memo);
        client.cancel_request(&1, &creator);
        // Second cancellation should fail
        client.cancel_request(&1, &creator);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #1)")]
    fn test_get_nonexistent_request() {
        let (_env, client) = setup_env();
        // Should fail with InvalidPaymentId
        client.get_request(&999);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #5)")]
    fn test_invalid_amount() {
        let (env, client) = setup_env();
        let creator = Address::generate(&env);
        let recipient = Address::generate(&env);
        let memo = String::from_str(&env, "Zero amount");

        // Zero amount should fail
        client.create_request(&creator, &recipient, &0_i128, &memo);
    }

    #[test]
    fn test_get_requests_by_user() {
        let (env, client) = setup_env();
        let creator = Address::generate(&env);
        let recipient1 = Address::generate(&env);
        let recipient2 = Address::generate(&env);
        let memo = String::from_str(&env, "User requests");

        client.create_request(&creator, &recipient1, &100_i128, &memo);
        client.create_request(&creator, &recipient2, &200_i128, &memo);

        let creator_requests = client.get_requests_by_user(&creator);
        assert_eq!(creator_requests.len(), 2);
        assert_eq!(creator_requests.get(0).unwrap(), 1);
        assert_eq!(creator_requests.get(1).unwrap(), 2);

        let recipient1_requests = client.get_requests_by_user(&recipient1);
        assert_eq!(recipient1_requests.len(), 1);
        assert_eq!(recipient1_requests.get(0).unwrap(), 1);
    }
}
