import { useId } from 'react';
import type { CurrencyPurse, StandardCurrencyKey } from '../../engine';
import { STANDARD_CURRENCY_META } from './forge-constants';
import { NumberStepper } from './ForgeSharedControls';

export interface CurrencyPurseGridProps {
  currency: CurrencyPurse | undefined;
  onChangeStandardCoin: (coin: StandardCurrencyKey, nextAmount: number) => void;
  onChangeCustomCoin: (customId: string, nextAmount: number) => void;
  /** Si fourni, active le clic pour éditer les espèces personnalisées (Mode Édition). */
  editingCustomId?: string | null;
  onSelectCustomCurrency?: (customId: string | null) => void;
}

/**
 * Grille partagée à 3 colonnes pour les pièces D&D 5e et les espèces personnalisées.
 * Utilisée à l'identique en Mode Édition (Forge) et en Mode Partie (Cockpit).
 */
export function CurrencyPurseGrid({
  currency,
  onChangeStandardCoin,
  onChangeCustomCoin,
  editingCustomId = null,
  onSelectCustomCurrency,
}: CurrencyPurseGridProps) {
  const baseId = useId();
  const purse: CurrencyPurse = currency ?? {
    pp: 0,
    gp: 0,
    ep: 0,
    sp: 0,
    cp: 0,
    custom: [],
  };
  const customCurrencies = purse.custom ?? [];
  const isCustomEditable = onSelectCustomCurrency !== undefined;

  return (
    <div className="forge-currency-grid">
        {STANDARD_CURRENCY_META.map((coin) => (
          <div key={coin.key} className="forge-coin-card">
            <div className="forge-coin-head">
              <label
                htmlFor={`${baseId}-coin-${coin.key}`}
                className="forge-coin-abbr"
              >
                {coin.abbr}
              </label>
              <span className="forge-coin-rate">
                {coin.label} ({coin.gpRate})
              </span>
            </div>
            <NumberStepper
              id={`${baseId}-coin-${coin.key}`}
              name={`coin-${coin.key}`}
              value={purse[coin.key]}
              min={0}
              max={9999999}
              step={1}
              decrementLabel={`Retirer une pièce (${coin.label})`}
              incrementLabel={`Ajouter une pièce (${coin.label})`}
              onChange={(nextAmount) =>
                onChangeStandardCoin(coin.key, Math.max(0, Math.trunc(nextAmount)))
              }
            />
          </div>
        ))}

        {customCurrencies.map((entry) => {
          const isSelected = isCustomEditable && editingCustomId === entry.id;
          const cardClassName = isCustomEditable
            ? isSelected
              ? 'forge-coin-card forge-coin-card--custom forge-coin-card--selected'
              : 'forge-coin-card forge-coin-card--custom'
            : 'forge-coin-card';

          return (
            <div
              key={entry.id}
              className={cardClassName}
              onClick={
                isCustomEditable
                  ? (e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('button, input')) return;
                      onSelectCustomCurrency(isSelected ? null : entry.id);
                    }
                  : undefined
              }
            >
              {isCustomEditable ? (
                <button
                  type="button"
                  className="forge-coin-edit-trigger"
                  aria-pressed={isSelected}
                  aria-label={`Modifier l'espèce ${entry.name}`}
                  onClick={() =>
                    onSelectCustomCurrency(isSelected ? null : entry.id)
                  }
                >
                  <span className="forge-coin-abbr" title={entry.name}>
                    {entry.name}
                  </span>
                  <span className="forge-coin-rate">
                    {entry.gpEquivalent !== undefined
                      ? `${entry.gpEquivalent} po`
                      : 'Éditer'}
                  </span>
                </button>
              ) : (
                <div className="forge-coin-head">
                  <label
                    htmlFor={`${baseId}-cur-amt-${entry.id}`}
                    className="forge-coin-abbr"
                    title={entry.name}
                  >
                    {entry.name}
                  </label>
                  {entry.gpEquivalent !== undefined && (
                    <span className="forge-coin-rate">
                      {entry.gpEquivalent} po
                    </span>
                  )}
                </div>
              )}

              <NumberStepper
                id={`${baseId}-cur-amt-${entry.id}`}
                name={`cur-amt-${entry.id}`}
                value={entry.amount}
                min={0}
                max={9999999}
                step={1}
                decrementLabel={`Diminuer ${entry.name}`}
                incrementLabel={`Augmenter ${entry.name}`}
                onChange={(nextAmt) =>
                  onChangeCustomCoin(entry.id, Math.max(0, nextAmt))
                }
              />
            </div>
          );
        })}
    </div>
  );
}
