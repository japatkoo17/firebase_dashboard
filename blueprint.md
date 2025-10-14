# Prehľad Aplikácie

Tento projekt je dashboard pre klientov účtovnej firmy, postavený na platforme Next.js. Umožňuje klientom bezpečne sa prihlásiť a získať prístup k finančným dátam svojich firiem. Aplikácia poskytuje detailné vizualizácie kľúčových finančných ukazovateľov.

**Stav Kódu (Verzia 1.4):** Kódová základňa prešla rozsiahlou kontrolou a refaktoringom. Boli opravené všetky lintovacie chyby a varovania, vylepšené typovanie (odstránenie `any` typov) a pridané robustnejšie spracovanie chýb. Kód je teraz stabilný a pripravený na ďalší rozvoj.

## Dizajn a Funkcie

*   **Autentifikácia:** Prihlasovanie cez Firebase Authentication (Email/Heslo a Google).
*   **Výber Spoločnosti:** Zobrazenie firiem na základe priradených povolení.
*   **Hlavný Dashboard:** Detailný, interaktívny dashboard pre každú firmu s vizualizáciami pre:
    *   Výkaz ziskov a strát
    *   Súvahu
    *   Cash Flow
    *   Prieskumníka účtov (aktuálne s mock dátami)
*   **Admin Panel:**
    *   **Správa Spoločností:** Plná CRUD funkcionalita napojená na Firestore.
    *   **Správa Používateľov:** Správa rolí používateľov.
    *   **Správa Prístupov:** Priraďovanie prístupu používateľov k jednotlivým spoločnostiam.
*   **Dizajn:** Moderný a responzívny dizajn.

## Plán Implementácie a Ďalšie Kroky

1.  **Vylepšenie Chybových Stavov a Načítavania:**
    *   Implementovať lepšie vizuálne indikátory načítavania (napr. skeleton loaders) na všetkých stránkach, ktoré asynchrónne načítavajú dáta.
    *   Zobraziť informatívnejšie a používateľsky prívetivejšie chybové hlášky v prípade zlyhania načítania dát.

2.  **Implementácia Funkcionality Mazania Používateľov:**
    *   Navrhnúť a implementovať bezpečnú cloudovú funkciu, ktorá odstráni používateľa z Firebase Authentication a súvisiacich dát vo Firestore.
    *   Integrovať túto funkciu do admin panela s potvrdzovacím dialógom pre prevenciu náhodného vymazania.

3.  **Zlepšenie UI/UX v Admin Paneli:**
    *   Pridať funkciu vyhľadávania a filtrovania do tabuliek pre správu spoločností a používateľov, aby sa zjednodušila práca s väčším množstvom dát.
    *   Vylepšiť formuláre pre pridávanie a úpravu záznamov s pokročilejšou validáciou na strane klienta.

4.  **Dokončenie Zabezpečenia Dát:**
    *   Dôkladne otestovať a nasadiť Firestore Security Rules, aby sa zabezpečilo, že každý používateľ má prístup len k tým dátam, ku ktorým má explicitne pridelené oprávnenia.

5.  **Prepojenie Prieskumníka Účtov na Reálne Dáta:**
    *   Nahradiť mock dáta v `AccountExplorerTab` reálnymi dátami synchronizovanými z AbraFlexi.
