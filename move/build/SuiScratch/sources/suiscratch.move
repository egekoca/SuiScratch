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
    use sui::random::{Self, Random, new_generator};
    use std::vector;

    /// Game mode types
    const STANDARD_MODE: u8 = 0;
    const GOLD_MODE: u8 = 1;
    const PLATINUM_MODE: u8 = 2;

    /// Symbol IDs (must match frontend)
    /// STANDARD: 0=DIAMOND, 1=DROP, 2=ROCKET, 3=COIN, 4=STAR (5 symbols)
    /// GOLD: 0=DIAMOND, 1=DROP, 2=ROCKET, 3=COIN, 4=STAR, 5=CROWN (6 symbols)
    /// PLATINUM: 0=DIAMOND, 1=DROP, 2=ROCKET, 3=COIN, 4=STAR, 5=CROWN, 6=SPARKLES (7 symbols)
    const SYMBOL_DIAMOND: u8 = 0;
    const SYMBOL_DROP: u8 = 1;
    const SYMBOL_ROCKET: u8 = 2;
    const SYMBOL_COIN: u8 = 3;
    const SYMBOL_STAR: u8 = 4;
    const SYMBOL_CROWN: u8 = 5;
    const SYMBOL_SPARKLES: u8 = 6;

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
        grid: vector<u8>, // Grid symbols generated on-chain (each u8 is a symbol ID)
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
    /// Uses Sui's on-chain random number generator for fair randomness
    /// Random is a global shared object at address 0x8
    entry fun purchase_ticket(
        config: &mut GameConfig,
        payment: Coin<SUI>,
        mode: u8,
        clock: &Clock,
        r: &Random, // Sui's global Random object (address 0x8)
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

        // Generate grid on-chain using Sui's random number generator
        // This ensures fair and verifiable randomness - all symbols are determined on-chain
        let generator = new_generator(r, ctx);
        
        // Get grid size based on mode
        let grid_size = get_grid_size(mode);
        let total_cells = grid_size * grid_size;
        
        // Get available symbols for this mode
        let num_symbols = get_num_symbols(mode);
        
        // Generate grid: each cell gets a random symbol ID
        // All symbols are randomly selected on-chain for fair and verifiable randomness
        let grid = vector::empty<u8>();
        let i = 0;
        while (i < total_cells) {
            // Generate random symbol index (0 to num_symbols-1)
            // Weighted: DIAMOND (0) has 10% chance, others have equal chance
            let rand = random::generate_u8_in_range(&mut generator, 0, 99);
            let symbol_id: u8;
            if (rand < 10) {
                // 10% chance for DIAMOND
                symbol_id = SYMBOL_DIAMOND;
            } else {
                // 90% chance distributed equally among other symbols (1 to num_symbols-1)
                let other_symbols = num_symbols - 1;
                if (other_symbols > 0) {
                    // Use modulo to distribute evenly: (rand - 10) % other_symbols + 1
                    let adjusted_rand = rand - 10; // 0-89 range
                    symbol_id = (adjusted_rand % other_symbols) + 1; // 1 to num_symbols-1
                } else {
                    symbol_id = SYMBOL_DIAMOND;
                };
            };
            vector::push_back(&mut grid, symbol_id);
            i = i + 1;
        };

        // Create ticket with on-chain generated grid
        let ticket = Ticket {
            player,
            mode,
            ticket_id,
            timestamp,
            grid,
            result_hash: vector::empty<u8>(),
            claimed: false,
        };

        // Store ticket in table
        table::add(&mut config.tickets, ticket_id, ticket);

        // Emit purchase event with random seed for frontend to use
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
    entry fun set_result_hash(
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
    entry fun set_result_and_claim(
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
    entry fun claim_winnings(
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

    /// Get grid size for a mode
    fun get_grid_size(mode: u8): u8 {
        if (mode == STANDARD_MODE) {
            3 // 3x3 = 9 cells
        } else if (mode == GOLD_MODE) {
            4 // 4x4 = 16 cells
        } else if (mode == PLATINUM_MODE) {
            5 // 5x5 = 25 cells
        } else {
            abort E_INVALID_MODE // Invalid mode
        }
    }

    /// Get number of available symbols for a mode
    fun get_num_symbols(mode: u8): u8 {
        if (mode == STANDARD_MODE) {
            5 // DIAMOND, DROP, ROCKET, COIN, STAR
        } else if (mode == GOLD_MODE) {
            6 // DIAMOND, DROP, ROCKET, COIN, STAR, CROWN
        } else if (mode == PLATINUM_MODE) {
            7 // DIAMOND, DROP, ROCKET, COIN, STAR, CROWN, SPARKLES
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
    
    /// Get ticket grid (on-chain generated symbols)
    public fun get_ticket_grid(config: &GameConfig, ticket_id: u64): vector<u8> {
        assert!(table::contains(&config.tickets, ticket_id), E_TICKET_NOT_FOUND);
        let ticket = table::borrow(&config.tickets, ticket_id);
        *&ticket.grid
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
    entry fun fund_treasury(
        config: &mut GameConfig,
        payment: Coin<SUI>,
        _ctx: &mut TxContext
    ) {
        // Transfer payment to treasury
        let payment_balance = coin::into_balance(payment);
        balance::join(&mut config.treasury, payment_balance);
    }

    /// Withdraw from treasury (admin only)
    entry fun withdraw_from_treasury(
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

