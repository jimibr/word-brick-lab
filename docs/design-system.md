# WordBrickLab: pracovní rozhraní

## Záměr

Klidný nástroj pro přípravu jazykových kostek. Výrazným prvkem jsou skutečné modely kostek; okolní rozhraní jim dává prostor. Vzhled zachovává schválený zelený směr, bez dekorativních kroků a opakovaných projektových formulářů.

## Základní pravidla

- Pozadí `#f3f5f3`, plocha `#ffffff`, text `#20372c`, pomocný text `#5c6d63`, předěl `#dbe3dc`, hlavní akce `#286748`. Základní hodnoty jsou proměnné v `src/styles.css`.
- Typografie Segoe UI / systémová: 15 px základ, 14–16 px formuláře a seznam, 12 px pomocný text, 25–28 px titulky. Žádná externí fontová služba.
- Rozestupy v násobcích 4 px. Rozestup hlavních oblastí 24 px. Pole a tlačítka nejméně 42 px, na mobilu 44 px.
- Jedna hlavní akce v každé oblasti. Export jednotlivého dílu je vedlejší akce a obsahuje jeho konkrétní název.
- Kategorie používají existující společné barvy z doménového modelu. Změna kategorie mění také barvu náhledu.

## Obrazovky

- **Obsah:** věty nebo výuková sada, pravidla počítání a zpracování, živá 3D ukázka. Vlastní věty se po krátké prodlevě ukládají. Na mobilu nejprve zdroj a zadání, pak náhled a další volby.
- **Kostky:** seznam s počty a samostatný detail s modelem. Výška modelu nezávisí na počtu položek. Na notebooku seznam roluje samostatně; na mobilu zůstává kompaktní detail nad seznamem. Vypočtený počet lze po ruční změně obnovit.
- **Tisk a export:** podložka ve skutečném poměru stran, přepínání více podložek, počty a hlavní stažení celé sady. Rozpracované projekty jsou odděleny od tiskových souborů.
- **Nastavení:** všechny relevantní hodnoty otevřené. Skupiny Typ dílu, Text na kostce, Tisková plocha, Stěny a spoj. Hodnota před ilustrací, lokalizované názvy polí.

## Ověření

Proklikání v prohlížeči na notebooku a mobilu, včetně otočení modelu. Sedm automatizovaných scénářů kontroluje viditelnost náhledu, rozměry podložky, změnu kategorie a barvy, ruční počet a jeho obnovu, volné přepínání, nastavení a reset, více podložek, ukládání a načtení projektu, lokalizaci, skutečné STL/ZIP stažení, prázdné zadání, dlouhé slovo a šířky 390/320 px. Obdélníková podložka má samostatnou kontrolu poměru stran.

Prošlo také všech 39 testů výpočtů a geometrie, produkční sestavení a lint. Kontrola nepředstavuje úplný audit WCAG ani fyzickou kalibraci tisku.
