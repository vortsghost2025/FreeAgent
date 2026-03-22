// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IUniswapV2Router02 {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

/**
 * @title MEVSwarmExecutor
 * @dev MEV Swarm Arbitrage Executor Contract
 *
 * Simplified executor for mainnet deployment
 * - Multi-hop swap execution
 * - Profit withdrawal
 * - Access control
 * - Emergency pause
 */
contract MEVSwarmExecutor is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    // ============ State Variables ============
    uint256 public totalExecuted;
    uint256 public totalProfit;
    uint256 public totalFailed;
    bool public paused;

    // ============ Events ============
    event ArbitrageExecuted(
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountIn,
        uint256 profit,
        uint256 timestamp
    );

    event ExecutionFailed(
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountIn,
        string reason
    );

    event ProfitWithdrawn(address indexed owner, uint256 amount);
    event EmergencyPaused(bool paused);

    // ============ Modifiers ============
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    // ============ Constructor ============
    constructor() Ownable(msg.sender) {}

    // ============ Core Functions ============

    /**
     * @dev Execute arbitrage (simplified version)
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @param amountIn Amount to trade
     */
    function executeArbitrage(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external nonReentrant whenNotPaused {
        require(tokenIn != address(0), "Invalid tokenIn");
        require(tokenOut != address(0), "Invalid tokenOut");
        require(amountIn > 0, "Amount must be > 0");

        // Transfer tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Execute swap using Uniswap V2 Router
        IERC20(tokenIn).safeIncreaseAllowance(UNISWAP_V2_ROUTER, amountIn);

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint256 amountOut;
        try IUniswapV2Router02(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            amountIn,
            1,
            path,
            address(this),
            block.timestamp + 300
        ) returns (uint256[] memory amounts) {
            require(amounts.length >= 2, "Swap output missing");
            amountOut = amounts[amounts.length - 1];
        } catch Error(string memory reason) {
            totalFailed++;
            emit ExecutionFailed(tokenIn, tokenOut, amountIn, reason);
            revert(reason);
        } catch {
            totalFailed++;
            emit ExecutionFailed(tokenIn, tokenOut, amountIn, "Swap failed");
            revert("Swap failed");
        }

        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;

        totalExecuted++;
        totalProfit += profit;

        emit ArbitrageExecuted(tokenIn, tokenOut, amountIn, profit, block.timestamp);

        // Return swapped tokens to sender
        if (amountOut > 0) {
            IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        }
    }

    // ============ Admin Functions ============

    /**
     * @dev Withdraw profits
     */
    function withdrawProfit(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance to withdraw");

        IERC20(token).safeTransfer(owner(), balance);

        emit ProfitWithdrawn(owner(), balance);
    }

    /**
     * @dev Withdraw ETH
     */
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");

        payable(owner()).transfer(balance);
    }

    /**
     * @dev Pause contract
     */
    function pause() external onlyOwner {
        paused = true;
        emit EmergencyPaused(true);
    }

    /**
     * @dev Unpause contract
     */
    function unpause() external onlyOwner {
        paused = false;
        emit EmergencyPaused(false);
    }

    /**
     * @dev Get contract stats
     */
    function getStats()
        external
        view
        returns (
            uint256 _totalExecuted,
            uint256 _totalProfit,
            uint256 _totalFailed,
            bool _paused
        )
    {
        return (totalExecuted, totalProfit, totalFailed, paused);
    }

    /**
     * @dev Get token balance
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @dev Receive ETH
     */
    receive() external payable {}
}
