export default async function Server() {
  const pikachu = await fetch('https://pokeapi.co/api/v2/pokemon/pikachu').then(res => res.json());
  const raichu = await fetch('https://pokeapi.co/api/v2/pokemon/raichu').then(res => res.json());
  return (
    <main>
      <div aria-label="pikachu">{pikachu.name}</div>
      <div aria-label="raichu">{raichu.name}</div>
    </main>
  )
}
