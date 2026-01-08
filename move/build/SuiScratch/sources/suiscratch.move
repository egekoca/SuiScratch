module suiscratch::suiscratch {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::object::{Self, UID};
    use sui::balance::{Self, Balance};
    use sui::event;
    use sui::table::{Self, Table};
    use sui::clock::{Self, Clock};
    use std::vector;

    /// Game mode types
    const STANDARD_MODE: u8 = 0;
    const GOLD_MODE: u8 = 1;
    const PLATINUM_MODE: u8 = 2;

    /// Ticket prices in MIST (1 SUI = 1,000,000,000 MIST)
    /// Testnet prices (5x cheaper than mainnet)
    const STANDARD_PRICE: u64 = 1_000_000_000; // 1 SUI (was 5 SUI)
    const GOLD_PRICE: u64 = 2_000_000_000; // 2 SUI (was 10 SUI)
    const PLATINUM_PRICE: u64 = 5_000_000_000; // 5 SUI (was 25 SUI)

    /// Error codes
    const E_INSUFFICIENT_PAYMENT: u64 = 0;
    const E_INVALID_MODE: u64 = 1;
    const E_INSUFFICIENT_TREASURY: u64 = 2;
    const E_TICKET_NOT_FOUND: u64 = 3;
    const E_TICKET_ALREADY_CLAIMED: u64 = 4;
    const E_UNAUTHORIZED: u64 = 5;
    const E_INVALID_RESULT_HASH: u64 = 6;
    const E_RESULT_HASH_ALREADY_SET: u64 = 7;
    const E_NOT_ADMIN: u64 = 8;

    /// Admin address (only this address can manage treasury)
    const ADMIN_ADDRESS: address = @0x25ad5635da6045902f6d7abcba29c8596d4985da89a4895444ddadcbdf96f061;

    /// Ticket struct to track game tickets
    struct Ticket has store {
        player: address,
        mode: u8,
        ticket_id: u64,
        timestamp: u64,
        result_hash: vector<u8>, // Hash of game result for verification
        claimed: bool,
    }

    /// Game configuration
    struct GameConfig has key {
        id: UID,
        treasury: Balance<SUI>,
        total_distributed: u64,
        ticket_counter: u64,
        tickets: Table<u64, Ticket>, // Ticket ID -> Ticket mapping
    }

    /// Ticket purchase event
    struct TicketPurchased has copy, drop {
        player: address,
        mode: u8,
        ticket_id: u64,
    }

    /// Win event
    struct WinEvent has copy, drop {
        player: address,
        amount: u64,
        ticket_id: u64,
    }

    /// Initialize the game module
    fun init(ctx: &mut TxContext) {
        let config = GameConfig {
            id: object::new(ctx),
            treasury: balance::zero<SUI>(),
            total_distributed: 0,
            ticket_counter: 0,
            tickets: table::new(ctx),
        };
        transfer::share_object(config);
    }

    /// Purchase a ticket for a specific game mode
    public entry fun purchase_ticket(
        config: &mut GameConfig,
        payment: Coin<SUI>,
        mode: u8,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let price = get_ticket_price(mode);
        assert!(coin::value(&payment) >= price, E_INSUFFICIENT_PAYMENT);

        // Transfer payment to treasury
        let payment_value = coin::value(&payment);
        let payment_balance = coin::into_balance(payment);
        balance::join(&mut config.treasury, payment_balance);

        // Generate unique ticket ID using counter
        let ticket_id = config.ticket_counter;
        config.ticket_counter = config.ticket_counter + 1;

        let player = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);

        // Create ticket with empty result hash (will be set when game is played)
        let ticket = Ticket {
            player,
            mode,
            ticket_id,
            timestamp,
            result_hash: vector::empty<u8>(),
            claimed: false,
        };

        // Store ticket in table
        table::add(&mut config.tickets, ticket_id, ticket);

        // Emit purchase event
        event::emit(TicketPurchased {
            player,
            mode,
            ticket_id,
        });

        // Return change if any
        if (payment_value > price) {
            let change = payment_value - price;
            let change_balance = balance::split(&mut config.treasury, change);
            let change_coin = coin::from_balance(change_balance, ctx);
            transfer::public_transfer(change_coin, player);
        };
    }

    /// Set game result hash for a ticket (called after game is played)
    public entry fun set_result_hash(
        config: &mut GameConfig,
        ticket_id: u64,
        result_hash: vector<u8>,
        ctx: &mut TxContext
    ) {
        let player = tx_context::sender(ctx);
        
        // Get ticket
        assert!(table::contains(&config.tickets, ticket_id), E_TICKET_NOT_FOUND);
        let ticket = table::borrow_mut(&mut config.tickets, ticket_id);
        
        // Verify ticket belongs to player
        assert!(ticket.player == player, E_UNAUTHORIZED);
        
        // Verify ticket is not already claimed
        assert!(!ticket.claimed, E_TICKET_ALREADY_CLAIMED);
        
        // Set result hash (only if not already set)
        assert!(std::vector::length(&ticket.result_hash) == 0, E_RESULT_HASH_ALREADY_SET);
        ticket.result_hash = result_hash;
    }

    /// Set result hash and claim winnings in a single transaction
    /// This reduces wallet confirmations from 2 to 1
    public entry fun set_result_and_claim(
        config: &mut GameConfig,
        ticket_id: u64,
        amount: u64,
        result_hash: vector<u8>,
        ctx: &mut TxContext
    ) {
        let player = tx_context::sender(ctx);
        
        // Get ticket
        assert!(table::contains(&config.tickets, ticket_id), E_TICKET_NOT_FOUND);
        let ticket = table::borrow_mut(&mut config.tickets, ticket_id);
        
        // Verify ticket belongs to player
        assert!(ticket.player == player, E_UNAUTHORIZED);
        
        // Verify ticket is not already claimed
        assert!(!ticket.claimed, E_TICKET_ALREADY_CLAIMED);
        
        // Set result hash (only if not already set)
        if (std::vector::length(&ticket.result_hash) == 0) {
            ticket.result_hash = result_hash;
        };
        
        // Verify result hash matches
        assert!(ticket.result_hash == result_hash, E_INVALID_RESULT_HASH);
        
        // Verify treasury has enough balance
        assert!(balance::value(&config.treasury) >= amount, E_INSUFFICIENT_TREASURY);

        // Mark ticket as claimed
        ticket.claimed = true;

        // Transfer winnings
        let winnings_balance = balance::split(&mut config.treasury, amount);
        let winnings = coin::from_balance(winnings_balance, ctx);
        transfer::public_transfer(winnings, player);

        // Update statistics
        config.total_distributed = config.total_distributed + amount;

        // Emit win event
        event::emit(WinEvent {
            player,
            amount,
            ticket_id,
        });
    }

    /// Claim winnings (called after game result is verified)
    /// @deprecated Use set_result_and_claim instead
    public entry fun claim_winnings(
        config: &mut GameConfig,
        ticket_id: u64,
        amount: u64,
        result_hash: vector<u8>,
        ctx: &mut TxContext
    ) {
        let player = tx_context::sender(ctx);
        
        // Get ticket
        assert!(table::contains(&config.tickets, ticket_id), E_TICKET_NOT_FOUND);
        let ticket = table::borrow_mut(&mut config.tickets, ticket_id);
        
        // Verify ticket belongs to player
        assert!(ticket.player == player, E_UNAUTHORIZED);
        
        // Verify ticket is not already claimed
        assert!(!ticket.claimed, E_TICKET_ALREADY_CLAIMED);
        
        // Verify result hash matches
        assert!(ticket.result_hash == result_hash, E_INVALID_RESULT_HASH);
        
        // Verify treasury has enough balance
        assert!(balance::value(&config.treasury) >= amount, E_INSUFFICIENT_TREASURY);

        // Mark ticket as claimed
        ticket.claimed = true;

        // Transfer winnings
        let winnings_balance = balance::split(&mut config.treasury, amount);
        let winnings = coin::from_balance(winnings_balance, ctx);
        transfer::public_transfer(winnings, player);

        // Update statistics
        config.total_distributed = config.total_distributed + amount;

        // Emit win event
        event::emit(WinEvent {
            player,
            amount,
            ticket_id,
        });
    }

    /// Get ticket price for a mode
    fun get_ticket_price(mode: u8): u64 {
        if (mode == STANDARD_MODE) {
            STANDARD_PRICE
        } else if (mode == GOLD_MODE) {
            GOLD_PRICE
        } else if (mode == PLATINUM_MODE) {
            PLATINUM_PRICE
        } else {
            abort E_INVALID_MODE // Invalid mode
        }
    }

    /// Get total distributed amount
    public fun get_total_distributed(config: &GameConfig): u64 {
        config.total_distributed
    }

    /// Get treasury balance
    public fun get_treasury_balance(config: &GameConfig): u64 {
        balance::value(&config.treasury)
    }

    /// Get ticket information
    public fun get_ticket(config: &GameConfig, ticket_id: u64): (address, u8, u64, bool) {
        assert!(table::contains(&config.tickets, ticket_id), E_TICKET_NOT_FOUND);
        let ticket = table::borrow(&config.tickets, ticket_id);
        (ticket.player, ticket.mode, ticket.timestamp, ticket.claimed)
    }

    /// Check if ticket exists
    public fun ticket_exists(config: &GameConfig, ticket_id: u64): bool {
        table::contains(&config.tickets, ticket_id)
    }

    /// Get ticket result hash (for verification)
    public fun get_ticket_result_hash(config: &GameConfig, ticket_id: u64): vector<u8> {
        assert!(table::contains(&config.tickets, ticket_id), E_TICKET_NOT_FOUND);
        let ticket = table::borrow(&config.tickets, ticket_id);
        *&ticket.result_hash
    }

    /// Fund the treasury (for initial setup or adding more funds)
    public entry fun fund_treasury(
        config: &mut GameConfig,
        payment: Coin<SUI>,
        _ctx: &mut TxContext
    ) {
        // Transfer payment to treasury
        let payment_balance = coin::into_balance(payment);
        balance::join(&mut config.treasury, payment_balance);
    }

    /// Withdraw from treasury (admin only)
    public entry fun withdraw_from_treasury(
        config: &mut GameConfig,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(sender == ADMIN_ADDRESS, E_NOT_ADMIN);
        
        // Verify treasury has enough balance
        assert!(balance::value(&config.treasury) >= amount, E_INSUFFICIENT_TREASURY);
        
        // Transfer funds to admin
        let withdrawal_balance = balance::split(&mut config.treasury, amount);
        let withdrawal_coin = coin::from_balance(withdrawal_balance, ctx);
        transfer::public_transfer(withdrawal_coin, sender);
    }

    /// Check if address is admin
    public fun is_admin(addr: address): bool {
        addr == ADMIN_ADDRESS
    }
}

