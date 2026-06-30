import type { Club } from '@/types/database';

export interface ClubAmenitiesSummary {
  paymentLabel: string | null;
  multisportCoverageLabel: string | null;
  benefitCardsLabel: string | null;
  dogsLabel: string | null;
  foodDrinksText: string | null;
  rentalText: string | null;
  serviceLines: string[];
  fullParagraph: string | null;
  hasAny: boolean;
}

const DEFAULT_FOOD_DRINKS = 'V klubu je k dispozici pití a občerstvení.';
const DEFAULT_RENTAL = 'Klub nabízí zapůjčení sportovního vybavení.';

export function buildClubAmenitiesSummary(club: Club): ClubAmenitiesSummary {
  const paymentParts: string[] = [];
  if (club.accepts_cash) paymentParts.push('hotově');
  if (club.accepts_card) paymentParts.push('kartou');
  if (club.accepts_benefit_cards) paymentParts.push('stravenkovými / benefitními kartami');

  const paymentLabel = paymentParts.length > 0
    ? `Platba: ${paymentParts.join(', ')}`
    : null;

  const multisportCoverageLabel = club.accepts_multisport
    ? club.multisport_coverage_amount != null && club.multisport_coverage_amount > 0
      ? `Multisport karta pokryje ${club.multisport_coverage_amount} Kč z ceny kurtu (za hodinu).`
      : 'Klub akceptuje Multisport karty.'
    : null;

  const benefitCardsLabel = club.accepts_benefit_cards
    ? (club.benefit_cards_description?.trim()
      || 'Klub akceptuje stravenkové a benefitní karty.')
    : null;

  const dogsLabel = club.allows_dogs
    ? 'Psi v areálu klubu jsou povoleni.'
    : club.allows_dogs === false
      ? 'Psi v areálu klubu nejsou povoleni.'
      : null;

  const foodDrinksText = club.offers_food_drinks
    ? (club.food_drinks_description?.trim() || DEFAULT_FOOD_DRINKS)
    : null;

  const rentalText = club.offers_equipment_rental
    ? (club.equipment_rental_description?.trim() || DEFAULT_RENTAL)
    : null;

  const serviceLines: string[] = [];
  if (club.sells_sport_equipment) serviceLines.push('Prodej sportovního vybavení');
  if (club.sells_clothing) serviceLines.push('Prodej sportovního oblečení');
  const servicesExtra = club.services_description?.trim();
  if (servicesExtra) serviceLines.push(servicesExtra);

  const paragraphParts = [
    paymentLabel,
    multisportCoverageLabel,
    benefitCardsLabel,
    dogsLabel,
    foodDrinksText,
    rentalText,
    ...serviceLines,
  ].filter(Boolean) as string[];

  return {
    paymentLabel,
    multisportCoverageLabel,
    benefitCardsLabel,
    dogsLabel,
    foodDrinksText,
    rentalText,
    serviceLines,
    fullParagraph: paragraphParts.length > 0 ? paragraphParts.join(' ') : null,
    hasAny: paragraphParts.length > 0,
  };
}
