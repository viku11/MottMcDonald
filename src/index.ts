import Logger from './utils/logger';
import Table from './core/Table';
import inquirer from 'inquirer';
import { RobotCommand, RobotRotation } from './types/robot';
import chalk,{Chalk} from 'chalk';
import robotFactory from './core/Robot/factory';
import fs from "fs";
import path from "path";
import { EOL } from "os";

inquirer.registerPrompt('suggest', require('inquirer-prompt-suggest'));

const table = new Table({
  dimensions: { x: 5, y: 5 },
  isSafeMode: true,
});

const robot = robotFactory();

const initialQuestion = [
  {
    type: 'suggest',
    name: 'command',
    message: 'Please place your robot on the table:',
    suggestions: ['PLACE 0,0,NORTH'],
    validate: function (input: string) {
      input=input.toUpperCase();
      if (input.split(' ')[0] !== 'PLACE' || input.split(' ').length !== 2) {
        return 'Please enter a valid command. The first command should be PLACE command. e.g. PLACE 0,0,NORTH';
      }
      table.addRobot(robot).at(input.split(' ')[1]);
      return true;
    },
  },
];

const validCommands = ['PLACE', 'MOVE', 'LEFT', 'RIGHT', 'REPORT'];
const subsequentQuestions = [
  {
    type: 'suggest',
    name: 'command',
    message: 'Please enter your next command:',
    suggestions: validCommands,
    validate: function (input: string) {
      input=input.toUpperCase();
      const userCommand = input.split(' ')[0];
      if (!validCommands.includes(userCommand)) {
        return `Please enter a valid command (${validCommands.join(', ')})`;
      }

      try {
        switch (userCommand) {
          case RobotCommand.PLACE:
            table.place(table.getRobot()).at(input.split(' ')[1]);
            break;
          case RobotCommand.MOVE:
            table.getRobot().move();
            break;
          case RobotCommand.LEFT:
            table.getRobot().rotate(RobotRotation.LEFT);
            break;
          case RobotCommand.RIGHT:
            table.getRobot().rotate(RobotRotation.RIGHT);
            break;
          case RobotCommand.REPORT:
            Logger.success(`Current position: ${table.getRobot().report()}`);
            break;
        }
      } catch (error: any) {
        return error.message;
      }

      return true;
    },
  },
  {
    type: 'confirm',
    name: 'askAgain',
    message: 'Do you want to continue again?',
    default: true,
  },
];

const initialPrompt = () => {
  inquirer.prompt(initialQuestion).then(() => {
    subsequentPrompts();
  });
};

const subsequentPrompts = () => {
  inquirer.prompt(subsequentQuestions).then((response) => {
    if (response.askAgain) {
      subsequentPrompts();
    }
  });
};

const pickCommandQuestions = [
  {
    type: "list",
    name: "command",
    message: "How would you instruct your Robot? :",
    choices: [
      "Single command",
      "Provide a txt file containing multiple commands",
    ],
  },
];



// Run commands to robot via txt file
const fileNameQuestions = [
  {
    type: "input",
    name: "fileName",
    message:
      "Please provide a file name containing commands (Just hit enter to pick a default txt file)",
    default: () => "commands.txt",
  },
];



const askFileName = () => {
  inquirer
    .prompt(fileNameQuestions)
    .then((answers) => {
      try {
        const data = fs.readFileSync(path.join(__dirname, answers["fileName"]), "utf8");
        const commands = data.split(EOL);
        (initialQuestion[0] as any).validate(commands[0]);
        commands.shift();
        commands.forEach(
          (command) => {
          (subsequentQuestions[0] as any).validate(command)
        });
      } catch {
        console.error(
          "Error reading commands from file. Please check file path again."
        );
      }
    })
    .catch((err) => {
      console.log("Error occured: ", err);
    });
};
const choose=()=>{
  inquirer.prompt(pickCommandQuestions).then((answers) => {
    if (answers["command"] === "Single command") {
      Logger.color(chalk.cyan).log('The first valid command to the robot is a PLACE command. List  of valid commannds:\nPLACE X,Y,F\nLEFT\nRIGHT\nMOVE\nREPORT\n');

      initialPrompt();
    } else {
      askFileName();
    }
  });
}

Logger.printTitle('Mott MacDonald');
Logger.newLine();
choose();

