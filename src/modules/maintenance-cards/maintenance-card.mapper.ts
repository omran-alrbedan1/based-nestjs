import { Prisma } from 'generated/prisma/client';
import { getRequestLanguage } from 'src/common/utils/locale.util';
import { toOptionResponse } from '../maintenance-card-options/maintenance-option.mapper';
import { maintenanceCardDetailInclude } from './maintenance-card.selects';

type MaintenanceCardDetail = Prisma.MaintenanceCardGetPayload<{
  include: typeof maintenanceCardDetailInclude;
}>;

export function localizeEmbeddedOptions(card: MaintenanceCardDetail, lang = getRequestLanguage()) {
  return {
    ...card,
    visitReasons: card.visitReasons.map((row) => ({
      ...row,
      visitReason: toOptionResponse(row.visitReason, lang),
    })),
    conditionOptions: card.conditionOptions.map((row) => ({
      ...row,
      conditionOption: toOptionResponse(row.conditionOption, lang),
    })),
    itemOptions: card.itemOptions.map((row) => ({
      ...row,
      itemOption: toOptionResponse(row.itemOption, lang),
    })),
  };
}
