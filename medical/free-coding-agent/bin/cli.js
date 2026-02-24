#!/usr/bin/env node
import { createRequire } from "module";
const require = createRequire(import.meta.url);

import { program } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { CodingAgent } from "../src/agent.js";

const packageJson = require("../package.json");

program
  .name("free-coding-agent")
  .description("Free coding agent with multiple LLM backends")
  .version(packageJson.version)
  .option(
    "-p, --provider <provider>",
    "LLM provider (ollama, groq, together)",
    "ollama",
  )
  .option("-m, --model <model>", "Model to use")
  .option("-w, --working-dir <dir>", "Working directory", process.cwd())
  .option("--no-approval", "Disable approval for commands")
  .action(async (options) => {
    await runInteractive(options);
  });

program
  .command("chat <message>")
  .description("Send a single message to the agent")
  .option("-p, --provider <provider>", "LLM provider", "ollama")
  .option("-m, --model <model>", "Model to use")
  .option("-w, --working-dir <dir>", "Working directory", process.cwd())
  .action(async (message, options) => {
    await runSingle(message, options);
  });

program
  .command("models")
  .description("List available models")
  .option("-p, --provider <provider>", "LLM provider", "ollama")
  .action(async (options) => {
    await listModels(options);
  });

program
  .command("ensemble")
  .description("Run medical coding ensemble (multi-agent system)")
  .option("-c, --config <path>", "Path to ensemble config file", "./ensemble.config.json")
  .action(async (options) => {
    // Delegate to ensemble CLI
    const { execSync } = await import("child_process");
    try {
      execSync(`node ${__dirname}/ensemble-cli.js --help`, { stdio: "inherit" });
    } catch (error) {
      console.log(chalk.red(`\nRun: node ${__dirname}/ensemble-cli.js <command>\n`));
    }
  });

program.parse();

async function runInteractive(options) {
  console.log(chalk.cyan.bold("\n🤖 Free Coding Agent\n"));
  console.log(chalk.gray(`Provider: ${options.provider}`));
  console.log(chalk.gray(`Working directory: ${options.workingDir}`));
  console.log(
    chalk.gray('Type "exit" to quit, "clear" to reset conversation\n'),
  );

  const agent = new CodingAgent({
    provider: options.provider,
    model: options.model,
    workingDir: options.workingDir,
    requiresApproval: options.approval,
    onToolCall: (tool, params, result) => {
      console.log(chalk.yellow(`\n🔧 Tool: ${tool}`));
      if (result.success) {
        console.log(chalk.green("✓ Success"));
      } else {
        console.log(chalk.red(`✗ ${result.error}`));
      }
    },
  });

  // Check if provider is available
  const available = await agent.isAvailable();
  if (!available) {
    console.log(
      chalk.red(`\n✗ Provider "${options.provider}" is not available.`),
    );
    if (options.provider === "ollama") {
      console.log(chalk.yellow("Make sure Ollama is running: ollama serve"));
    } else if (options.provider === "groq") {
      console.log(chalk.yellow("Set GROQ_API_KEY environment variable"));
    } else if (options.provider === "together") {
      console.log(chalk.yellow("Set TOGETHER_API_KEY environment variable"));
    }
    process.exit(1);
  }

  // Main chat loop
  while (true) {
    const { message } = await inquirer.prompt([
      {
        type: "input",
        name: "message",
        message: chalk.blue("You:"),
        prefix: "",
      },
    ]);

    if (message.toLowerCase() === "exit") {
      console.log(chalk.gray("\nGoodbye!"));
      break;
    }

    if (message.toLowerCase() === "clear") {
      agent.reset();
      console.log(chalk.green("\n✓ Conversation cleared\n"));
      continue;
    }

    if (!message.trim()) continue;

    process.stdout.write(chalk.magenta("\nAssistant: "));

    try {
      for await (const event of agent.process(message)) {
        if (event.type === "chunk") {
          process.stdout.write(event.content);
        } else if (event.type === "approval_required") {
          console.log(
            chalk.yellow(
              `\n\n⚠️  Command requires approval: ${event.params.command}`,
            ),
          );
          const { approve } = await inquirer.prompt([
            {
              type: "confirm",
              name: "approve",
              message: "Approve this command?",
              default: false,
            },
          ]);
          if (approve) {
            process.stdout.write(chalk.magenta("\nAssistant: "));
            for await (const contEvent of agent.continue(true)) {
              if (contEvent.type === "chunk") {
                process.stdout.write(contEvent.content);
              }
            }
          } else {
            console.log(chalk.red("Command rejected."));
          }
        } else if (event.type === "input_required") {
          console.log(chalk.yellow(`\n\n❓ ${event.question}`));
          const { input } = await inquirer.prompt([
            {
              type: "input",
              name: "input",
              message: "Your answer:",
            },
          ]);
          process.stdout.write(chalk.magenta("\nAssistant: "));
          for await (const contEvent of agent.continue(false, input)) {
            if (contEvent.type === "chunk") {
              process.stdout.write(contEvent.content);
            }
          }
        }
      }
      console.log("\n");
    } catch (error) {
      console.log(chalk.red(`\nError: ${error.message}\n`));
    }
  }
}

async function runSingle(message, options) {
  const agent = new CodingAgent({
    provider: options.provider,
    model: options.model,
    workingDir: options.workingDir,
  });

  try {
    for await (const event of agent.process(message)) {
      if (event.type === "chunk") {
        process.stdout.write(event.content);
      } else if (event.type === "tool") {
        console.error(`\n[Tool: ${event.tool}]`);
      }
    }
    console.log();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function listModels(options) {
  const agent = new CodingAgent({ provider: options.provider });
  const spinner = ora("Fetching models...").start();

  try {
    const models = await agent.listModels();
    spinner.stop();

    if (models.length === 0) {
      console.log("No models found or provider not available.");
    } else {
      console.log("\nAvailable models:");
      models.forEach((model) => console.log(`  - ${model}`));
    }
  } catch (error) {
    spinner.fail(`Error: ${error.message}`);
  }
}
