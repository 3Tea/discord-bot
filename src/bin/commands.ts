import { Collection } from "discord.js";

import client from "../app";
import * as command from "../commands/index.cmd";

client.commands = new Collection();

client.commands.set(command, command);
