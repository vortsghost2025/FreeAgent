// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RealArbitrageExecutor
 * @dev Actually executes arbitrage swaps using Uniswap V2 router
 *
 * This contract ACTUALLY executes trades, unlike the placeholder
 * Fixed: Now accepts ETH directly and wraps to WETH internally
 */
contract RealArbitrageExecutor is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ============ Constants ============
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    // ============ State Variables ============
    uint256 public totalExecuted;
    uint256 public totalProfit;
    uint256 public totalFailed;
    bool public paused;

    // WETH interface for wrapping
    IWETH public immutable weth;

    // ============ Events ============
    event ArbitrageExecuted(
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountIn,
        uint256 amountOut,
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
    constructor() Ownable(msg.sender) {
        weth = IWETH(WETH);
    }

    // ============ Core Functions ============

    /**
     * @dev Execute arbitrage using Uniswap V2 router - accepts ETH directly
     * @param tokenIn Input token address (use WETH address for ETH)
     * @param tokenOut Output token address
     * @param amountIn Amount to trade (in wei)
     * @param minAmountOut Minimum output amount to accept (slippage protection)
     */
    function executeArbitrage(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external payable nonReentrant whenNotPaused {
        require(tokenIn != address(0), "Invalid tokenIn");
        require(tokenOut != address(0), "Invalid tokenOut");
        require(amountIn > 0, "Amount must be > 0");

        // Handle ETH input: wrap to WETH
        if (tokenIn == WETH && msg.value > 0) {
            require(msg.value >= amountIn, "Insufficient ETH sent");
            // Wrap ETH to WETH
            weth.deposit{value: amountIn}();
            // CRITICAL: Approve router to spend WETH after wrapping!
            IERC20(WETH).forceApprove(UNISWAP_V2_ROUTER, amountIn);
        } else if (tokenIn != WETH) {
            // For non-WETH tokens, transfer from sender (requires approval)
            IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
            // Approve router to spend tokens
            IERC20(tokenIn).forceApprove(UNISWAP_V2_ROUTER, amountIn);
        } else {
            // WETH provided but no ETH sent - check balance
            require(IERC20(tokenIn).balanceOf(msg.sender) >= amountIn, "Insufficient WETH balance");
            require(IERC20(tokenIn).allowance(msg.sender, address(this)) >= amountIn, "Insufficient WETH allowance");
            IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
            IERC20(tokenIn).forceApprove(UNISWAP_V2_ROUTER, amountIn);
        }

        // Execute swap via Uniswap V2 router
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint256 amountOutMin = minAmountOut; // Slippage protection

        uint256[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            address(this),
            block.timestamp
        );

        // Get output amount (last element in array)
        uint256 amountOut = amounts[amounts.length - 1];

        // Calculate profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;

        totalExecuted++;
        totalProfit += profit;

        emit ArbitrageExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);

        // Return tokens to sender
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

// ============ Interfaces ============

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint256) external;
}
