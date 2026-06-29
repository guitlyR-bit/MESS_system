import type { Club } from '@/types/database';

export interface ClubAmenitiesSummary {
  paymentLabel: string | null;
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
  if (club.accepts_multisport) paymentParts.push('Multisport kartou');

  const paymentLabel = paymentParts.length > 0
    ? `Platba: ${paymentParts.join(', ')}`
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
    dogsLabel,
    foodDrinksText,
    rentalText,
    ...serviceLines,
  ].filter(Boolean) as string[];

  return {
    paymentLabel,
    dogsLabel,
    foodDrinksText,
    rentalText,
    serviceLines,
    fullParagraph: paragraphParts.length > 0 ? paragraphParts.join(' ') : null,
    hasAny: paragraphParts.length > 0,
  };
}
