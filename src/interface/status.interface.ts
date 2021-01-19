import { Document } from "mongoose";

export interface IStatus extends Document {
    commandName?: string;
    commandDescription?: string;
    status?: Number | any;
}
