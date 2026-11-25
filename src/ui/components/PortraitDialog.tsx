import { useId } from 'react';
import type { RefObject } from 'react';
import { handleDialogBackdropClick } from './dialog-utils';

export interface PortraitDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  characterName: string;
  portraitUrl: string;
}

/**
 * Modale <dialog> centrée affichant le portrait du personnage en taille native
 * (jusqu'à 512 x 512 px) tout en restant adaptée aux écrans de tablette ou mobile.
 */
export function PortraitDialog({
  dialogRef,
  characterName,
  portraitUrl,
}: PortraitDialogProps) {
  const titleId = useId();

  return (
    <dialog
      ref={dialogRef}
      className="grimoire-dialog grimoire-dialog--portrait"
      aria-labelledby={titleId}
      onClick={handleDialogBackdropClick}
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      <div className="dialog-header">
        <h2 id={titleId}>Portrait de {characterName}</h2>
        <form method="dialog">
          <button type="submit" className="action-btn">
            Fermer
          </button>
        </form>
      </div>

      <div className="portrait-modal-stage">
        <img
          className="portrait-modal-image"
          src={portraitUrl}
          alt={`Portrait agrandi de ${characterName}`}
        />
      </div>
    </dialog>
  );
}
