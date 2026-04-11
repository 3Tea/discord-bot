import WalletService from "../../services/economy/wallet.service";
import log from "../log/logger.mixed";

/**
 * Rolls for a star drop. If successful, awards 1 star to the user's global wallet.
 * @param userId - The user to potentially award
 * @param rate - Drop probability (0.0 to 1.0)
 * @param source - Command name for transaction metadata
 * @returns true if a star was awarded
 */
export async function tryStarDrop(userId: string, rate: number, source: string): Promise<boolean> {
    if (Math.random() >= rate) return false;

    try {
        await WalletService.addStar(userId, 1, "star_drop", { source });
        return true;
    } catch (error) {
        log(`[star_drop] Failed for ${userId}: ${error instanceof Error ? error.message : "Unknown"}`, "error");
        return false;
    }
}
