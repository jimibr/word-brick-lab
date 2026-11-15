import type { Locale } from "../domain/types";
import freshBricks from "../assets/help/fresh-bricks.webp";
import printBed from "../assets/help/print-bed.webp";
import colorBricks from "../assets/help/color-bricks.webp";
import playBricks from "../assets/help/play-bricks.webp";

export function HelpPage({
  locale,
  onStart,
  onPrint,
}: {
  locale: Locale;
  onStart: () => void;
  onPrint: () => void;
}) {
  const say = (cs: string, en: string) => (locale === "cs" ? cs : en);

  return (
    <article className="help-page">
      <section className="help-hero">
        <div className="help-hero-copy">
          <p className="help-kicker">{say("Jak na to", "How it works")}</p>
          <h2>
            {say(
              "Ze slov rovnou do ruky.",
              "From words on screen to words in hand.",
            )}
          </h2>
          <p>
            {say(
              "Připravte si vlastní sadu, vytiskněte ji a skládejte věty tak dlouho, dokud nezačnou dávat smysl samy od sebe.",
              "Make your own set, print it, and keep rebuilding sentences until they start to feel natural.",
            )}
          </p>
          <button className="primary" type="button" onClick={onStart}>
            {say("Vytvořit první kostky", "Create your first bricks")}
          </button>
        </div>
        <figure className="help-hero-photo">
          <img
            src={freshBricks}
            alt={say(
              "Čerstvě vytištěná sada bílých slovních kostek",
              "A freshly printed set of white word bricks",
            )}
          />
          <figcaption>
            {say(
              "Váš nápad. Vaše slova. Vaše sada.",
              "Your idea. Your words. Your set.",
            )}
          </figcaption>
        </figure>
      </section>

      <section className="help-journey" aria-labelledby="help-journey-title">
        <div className="help-journey-heading">
          <h2 id="help-journey-title">
            {say(
              "Čtyři kroky a můžete skládat",
              "Four steps and you are ready to build",
            )}
          </h2>
          <p>
            {say(
              "WordBrickLab připraví modely. Zbytek už zvládne běžná 3D tiskárna a trochu chuti si hrát.",
              "WordBrickLab prepares the models. A regular 3D printer and a little curiosity take care of the rest.",
            )}
          </p>
        </div>

        <article className="help-step help-step--download">
          <div className="help-step-copy">
            <span className="help-step-number">1</span>
            <div>
              <h3>{say("Stáhněte STL", "Download the STL")}</h3>
              <p>
                {say(
                  "Vyberte jednu kostku, nebo si stáhněte ZIP s celou sadou a rozloženými tiskovými podložkami. Rozměry podložky nastavíte podle své tiskárny.",
                  "Choose one brick, or download a ZIP with the complete set and arranged print plates. Set the bed dimensions to match your printer.",
                )}
              </p>
              <button type="button" onClick={onPrint}>
                {say("Přejít k tisku a exportu", "Go to print and export")}
              </button>
            </div>
          </div>
          <div className="help-file-stack" aria-hidden="true">
            <span className="help-file help-file--back">layout.stl</span>
            <span className="help-file">word-bricks.zip</span>
            <div className="help-mini-bricks">
              <i>we</i>
              <i>learn</i>
              <i>together</i>
            </div>
          </div>
        </article>

        <article className="help-step help-step--photo">
          <figure className="help-step-photo help-step-photo--printer">
            <img
              loading="lazy"
              decoding="async"
              src={printBed}
              alt={say(
                "Slovní kostky na tiskové podložce 3D tiskárny",
                "Word bricks on a 3D printer build plate",
              )}
            />
          </figure>
          <div className="help-step-copy">
            <span className="help-step-number">2</span>
            <div>
              <h3>
                {say("Pošlete je na tiskárnu", "Send them to your printer")}
              </h3>
              <p>
                {say(
                  "Otevřete STL ve svém sliceru, zvolte běžný profil pro materiál a vytiskněte. Pro první sadu doporučujeme nejdřív jednu zkušební kostku.",
                  "Open the STL in your slicer, choose your usual material profile, and print. For a first set, start with one test brick.",
                )}
              </p>
            </div>
          </div>
        </article>

        <article className="help-step help-step--photo help-step--reverse">
          <figure className="help-step-photo help-step-photo--markers">
            <img
              loading="lazy"
              decoding="async"
              src={colorBricks}
              alt={say(
                "Vystouplé nápisy na kostkách vybarvované akrylovými fixy",
                "Raised lettering on the bricks being coloured with acrylic markers",
              )}
            />
          </figure>
          <div className="help-step-copy">
            <span className="help-step-number">3</span>
            <div>
              <h3>{say("Přidejte barvy fixem", "Add colour with a marker")}</h3>
              <p>
                {say(
                  "Nemáte vícebarevnou 3D tiskárnu? Nevadí. Vystouplá písmena se snadno dobarví akrylovými fixy. Každému slovnímu druhu můžete dát vlastní barvu.",
                  "No multicolour 3D printer? That is fine. Raised letters are easy to colour with acrylic markers. Give each part of speech its own colour.",
                )}
              </p>
            </div>
          </div>
        </article>

        <article className="help-play">
          <img
            loading="lazy"
            decoding="async"
            src={playBricks}
            alt={say(
              "Barevně popsané slovní kostky při skládání vět na modré podložce",
              "Colour-coded word bricks being used to build sentences on a blue baseplate",
            )}
          />
          <div className="help-play-copy">
            <span className="help-step-number">4</span>
            <h2>{say("A teď už jen skládejte.", "Now start building.")}</h2>
            <p>
              {say(
                "Měňte slovosled, hledejte správné tvary, stavte otázky i legrační věty. Učení je nejlepší ve chvíli, kdy vypadá jako hra.",
                "Change the word order, find the right forms, and build questions or silly sentences. Learning works best when it feels like play.",
              )}
            </p>
            <button className="primary" type="button" onClick={onStart}>
              {say("Začít tvořit", "Start creating")}
            </button>
          </div>
        </article>
      </section>
    </article>
  );
}
