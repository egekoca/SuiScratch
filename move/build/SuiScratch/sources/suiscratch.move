module suiscratch::suiscratch {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::object::{Self, UID};
    use sui::balance::{Self, Balance};
    use sui::event;

    /// Game mode types
    const STANDARD_MODE: u8 = 0;
    const GOLD_MODE: u8 = 1;
    const PLATINUM_MODE: u8 = 2;

    /// Ticket prices in MIST (1 SUI = 1,000,000,000 MIST)
    const STANDARD_PRICE: u64 = 5_000_000_000; // 5 SUI
    const GOLD_PRICE: u64 = 10_000_000_000; // 10 SUI
    const PLATINUM_PRICE: u64 = 25_000_000_000; // 25 SUI

    /// Game configuration
    struct GameConfig has key {
        id: UID,
        treasury: Balance<SUI>,
        total_distributed: u64,
        ticket_counter: u64,
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
        };
        transfer::share_object(config);
    }

    /// Purchase a ticket for a specific game mode
    public entry fun purchase_ticket(
        config: &mut GameConfig,
        payment: Coin<SUI>,
        mode: u8,
        ctx: &mut TxContext
    ) {
        let price = get_ticket_price(mode);
        assert!(coin::value(&payment) >= price, 0);

        // Transfer payment to treasury
        let payment_value = coin::value(&payment);
        let payment_balance = coin::into_balance(payment);
        balance::join(&mut config.treasury, payment_balance);

        // Generate unique ticket ID using counter
        let ticket_id = config.ticket_counter;
        config.ticket_counter = config.ticket_counter + 1;

        // Emit purchase event
        event::emit(TicketPurchased {
            player: tx_context::sender(ctx),
            mode,
            ticket_id,
        });

        // Return change if any
        if (payment_value > price) {
            let change = payment_value - price;
            let change_balance = balance::split(&mut config.treasury, change);
            let change_coin = coin::from_balance(change_balance, ctx);
            transfer::public_transfer(change_coin, tx_context::sender(ctx));
        };
    }

    /// Claim winnings (called after game result is verified)
    public entry fun claim_winnings(
        config: &mut GameConfig,
        amount: u64,
        ticket_id: u64,
        ctx: &mut TxContext
    ) {
        let player = tx_context::sender(ctx);
        assert!(balance::value(&config.treasury) >= amount, 1);

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
            abort 2 // Invalid mode
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
}

