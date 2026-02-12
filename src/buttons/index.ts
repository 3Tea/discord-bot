import { BUTTON_ID } from '../util/config/button';
import { createReaderButton } from './reader.button';
import { ButtonHandler } from '../types/button';

const buttons: ButtonHandler[] = Object.values(BUTTON_ID).map((id) =>
  createReaderButton(id),
);

export default buttons;
