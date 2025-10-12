# Prehľad Aplikácie

Tento projekt je dashboard pre klientov účtovnej firmy, postavený na platforme Next.js. Umožňuje klientom bezpečne sa prihlásiť a získať prístup k finančným dátam svojich firiem. Aplikácia poskytuje detailné vizualizácie kľúčových finančných ukazovateľov.

## Dizajn a Funkcie (Verzia 1.3)

*   **Autentifikácia:** Prihlasovanie cez Firebase Authentication.
*   **Výber Spoločnosti:** Zobrazenie firiem na základe priradených povolení.
*   **Hlavný Dashboard:** Detailný, interaktívny dashboard pre každú firmu.
*   **Admin Panel:**
    *   **Správa Spoločností:** Plná CRUD funkcionalita napojená na Firestore.
    *   **Správa Používateľov:** Správa rolí používateľov uložených vo Firestore.
    *   **Správa Prístupov (Nové):** Nová sekcia, kde administrátori môžu priraďovať používateľom prístup k jednotlivým spoločnostiam.
*   **Dizajn:** Moderný a responzívny dizajn s podporou tmavého režimu.

## Plán Implementácie (Aktualizácia)

1.  **Vytvorenie Stránky pre Správu Prístupov (`/admin/permissions`):**
    *   Vývoj novej stránky v admin paneli.
    *   Vytvorenie layoutu, ktorý umožní výber používateľa a následné zobrazenie zoznamu firiem.
2.  **Vývoj Komponentu `PermissionsManager.tsx`:**
    *   Vytvorenie znovupoužiteľného komponentu, ktorý bude obsahovať:
        *   Dropdown na výber používateľa (načítaný z `users` kolekcie).
        *   Zoznam všetkých firiem (načítaný z `companies` kolekcie) s checkboxami.
        *   Logiku na čítanie a zápis povolení do novej `permissions` kolekcie vo Firestore.
3.  **Aktualizácia Navigácie:**
    *   Pridanie odkazu na novú stránku "Správa Prístupov" do hlavnej navigácie v admin paneli (`/admin/layout.tsx`).
4.  **Zabezpečenie Dát (Budúci krok):**
    *   Implementácia Firestore Security Rules, aby bežní používatelia videli dáta len pre firmy, ku ktorým majú explicitne povolený prístup.
