import { APIEmbedField } from 'discord.js';
import { BUTTON_ID } from '../../../util/config/button';
import { createMangaCommand, MangaCommandConfig } from './manga-command.factory';

function fieldOrPlaceholder(value: any, label?: string): string {
  if (value && (typeof value === 'string' ? value.length > 0 : true)) {
    return label ? `${label}: ${value}` : `${value}`;
  }
  return 'update...';
}

const configs: MangaCommandConfig[] = [
  {
    name: 'nhentai',
    description: 'H manga and D reader',
    apiPath: 'nhentai',
    siteUrl: (id) => `https://nhentai.net/g/${id}`,
    buttonId: BUTTON_ID.nhtaiRead,
    buildFields: (result): APIEmbedField[] => [
      {
        name: 'Title',
        value: `${result.optional_title?.english ?? ''}\n${result.optional_title?.japanese ?? ''}\n${result.optional_title?.pretty ?? ''}`,
        inline: false,
      },
      { name: 'Language', value: fieldOrPlaceholder(result.language), inline: true },
      { name: 'Artist', value: fieldOrPlaceholder(result.artist?.length ? result.artist : null), inline: true },
      { name: 'Total of pages', value: `${result.total}`, inline: true },
      { name: 'Group', value: fieldOrPlaceholder(result.group), inline: true },
      { name: 'Parodies', value: fieldOrPlaceholder(result.parodies), inline: true },
      { name: 'Characters', value: fieldOrPlaceholder(result.characters?.length ? result.characters : null), inline: true },
      { name: 'Last updated', value: fieldOrPlaceholder(result.upload_date), inline: true },
    ],
  },
  {
    name: 'nhentai-lite',
    description: 'H manga and D reader nhentai lite',
    apiPath: 'nhentaito',
    siteUrl: (id) => `https://nhentai.to/g/${id}`,
    buttonId: BUTTON_ID.nhentaiToRead,
    buildFields: (result): APIEmbedField[] => [
      { name: 'Title', value: `${result.title}`, inline: false },
      { name: 'Total of pages', value: `${result.total}`, inline: true },
      { name: 'Tags', value: fieldOrPlaceholder(result.tags?.length ? result.tags : null), inline: true },
    ],
  },
  {
    name: '3hentai',
    description: 'H manga and D from 3hentai',
    apiPath: '3hentai',
    siteUrl: (id) => `http://3hentai.net/d/${id}`,
    buttonId: BUTTON_ID.threeHentaiRead,
    buildFields: (result): APIEmbedField[] => [
      { name: 'Title', value: `${result.title}`, inline: false },
      { name: 'Total of pages', value: `${result.total}`, inline: true },
      { name: 'Tags', value: fieldOrPlaceholder(result.tags?.length ? result.tags : null), inline: true },
      { name: 'Update', value: fieldOrPlaceholder(result.upload_date?.length ? result.upload_date : null), inline: true },
    ],
  },
  {
    name: 'asmhentai',
    description: 'Gets random doujinshi on asmhentai',
    apiPath: 'asmhentai',
    siteUrl: (id) => `https://asmhentai.com/g/${id}`,
    buttonId: BUTTON_ID.asmHentaiRead,
    buildFields: (result): APIEmbedField[] => [
      { name: 'Title', value: `${result.title}`, inline: false },
      { name: 'Total of pages', value: `${result.total}`, inline: true },
      { name: 'Tags', value: fieldOrPlaceholder(result.tags?.length ? result.tags : null), inline: true },
      { name: 'Update', value: fieldOrPlaceholder(result.upload_date?.length ? result.upload_date : null), inline: true },
    ],
  },
  {
    name: 'hentaifox',
    description: 'Gets random doujinshi on hentaifox',
    apiPath: 'hentaifox',
    siteUrl: (id) => `https://hentaifox.com/gallery/${id}`,
    buttonId: BUTTON_ID.hentaiFoxRead,
    buildFields: (result): APIEmbedField[] => [
      { name: 'Title', value: `${result.title}`, inline: false },
      { name: 'Total of pages', value: `${result.total}`, inline: true },
      { name: 'Tags', value: fieldOrPlaceholder(result.tags?.length ? result.tags : null), inline: true },
      { name: 'Update', value: fieldOrPlaceholder(result.upload_date?.length ? result.upload_date : null), inline: true },
    ],
  },
  {
    name: 'pururin',
    description: 'Gets random doujinshi on pururin',
    apiPath: 'pururin',
    siteUrl: (id) => `https://pururin.to/gallery/${id}`,
    buttonId: BUTTON_ID.pururinRead,
    buildFields: (result): APIEmbedField[] => [
      { name: 'Title', value: `${result.title}`, inline: false },
      { name: 'Total of pages', value: `${result.total}`, inline: true },
      { name: 'Tags', value: fieldOrPlaceholder(result.tags?.length ? result.tags : null), inline: true },
    ],
  },
];

export default configs.map(createMangaCommand);
