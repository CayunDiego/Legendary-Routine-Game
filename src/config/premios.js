/* ---------------------------------------------------------------------------
 * TIENDA DE PREMIOS — se pagan con las monedas que gana jugando
 * Cuando canjea uno, queda guardado como cupón para mostrarte.
 * -------------------------------------------------------------------------*/
const PREMIOS = [
  { id:'abrazo',   nombre:'Abrazo de 3 minutos', costo:30,  icono:'🤗',
    desc:'Sin hablar, sin soltar, sin mirar el celular.' },
    
  { id:'peli',     nombre:'Elegís vos la peli',  costo:60,  icono:'🎬',
    desc:'Y no puedo quejarme ni una sola vez.' },
    
  { id:'masaje',   nombre:'Masaje de espalda',   costo:100, icono:'💆‍♀️',
    desc:'Quince minutos reales, cronometrados.' },
    
  { id:'postre',   nombre:'Mimo dulce',          costo:160, icono:'🍩',
    desc:'Te pido un helado, un café o tu postre favorito por delivery para que disfrutes en casa.' },
    
  { id:'hobby',    nombre:'Capricho material',   costo:220, icono:'✨',
    desc:'Te pido online algo chiquito que quieras para tu colección o hobby y te llega a tu casa.' },
    
  { id:'delivery', nombre:'Antojo a domicilio',  costo:350, icono:'🍕',
    desc:'Elegís lo que tengas ganas de comer, me avisás, y te lo mando por delivery.' }
];

export { PREMIOS };