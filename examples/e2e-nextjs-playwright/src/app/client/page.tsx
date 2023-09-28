'use client';
import useSWR from 'swr';

export default function Client() {
  const { data: pikachu } = useSWR('pikachu', async () => {
    console.log('fetch', typeof window)
    return fetch('https://pokeapi.co/api/v2/pokemon/pikachu').then(res => res.json());
  });
  const { data: raichu } = useSWR('raichu', async () => {
    console.log('fetch', typeof window)
    return fetch('https://pokeapi.co/api/v2/pokemon/raichu').then(res => res.json())
  });
  return (
    <main>
      {pikachu && <div aria-label="pikachu">{pikachu.name}</div>}
      {raichu && <div aria-label="raichu">{raichu.name}</div>}
    </main>
  )
}

