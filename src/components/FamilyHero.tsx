import type {Locale} from '../domain/types';

export function FamilyHero({locale}:{locale:Locale}){
 const cs=locale==='cs';
 return <section className="family-hero">
  <div className="hero-copy"><span className="hero-kicker">{cs?'Učení, které vezmete do ruky':'Learning you can hold'}</span><h2>{cs?'Postavte větu. Zahrajte si s jazykem.':'Build a sentence. Play with language.'}</h2><p>{cs?'Z vašich slov vytvoříme barevné kostky připravené pro 3D tisk.':'Turn your words into colorful bricks, ready for 3D printing.'}</p><div className="hero-steps"><span><b>1</b>{cs?'Vyberte slova':'Pick words'}</span><span><b>2</b>{cs?'Prohlédněte 3D':'See in 3D'}</span><span><b>3</b>{cs?'Vytiskněte a hrajte':'Print & play'}</span></div><div className="audience"><span>🏠 {cs?'Pro rodiny':'Families'}</span><span>🎒 {cs?'Pro učitele':'Teachers'}</span></div></div>
  <div className="hero-art" aria-hidden="true"><i className="spark one">✦</i><i className="spark two">✦</i><div className="word-brick blue"><span>I</span></div><div className="word-brick coral"><span>am</span></div><div className="word-brick yellow"><span>ready!</span></div><div className="smile">⌣</div></div>
 </section>
}
