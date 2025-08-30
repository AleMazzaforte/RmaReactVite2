import React, { useEffect, useState } from "react";


// Definir la interfaz para los datos básicos de un Pokémon
interface Pokemon {
  name: string;
  url: string;
}

// Definir la interfaz para los detalles de un Pokémon
interface PokemonDetails {
  name: string;
  sprites: {
    front_default: string;
  };
  types: {
    type: {
      name: string;
    };
  }[];
  stats: {
    base_stat: number;
    stat: {
      name: string;
    };
  }[];
  abilities: {
    ability: {
      name: string;
    };
  }[];
  weight: number;
  height: number;
}

export const PokemonList: React.FC = () => {
  const [pokemonList, setPokemonList] = useState<Pokemon[]>([]);
  const [pokemonDetails, setPokemonDetails] = useState<PokemonDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Función para obtener la lista de Pokémon
  const fetchPokemonList = async () => {
  
    try {
      const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=150"); // Limitamos a 151 Pokémon
      if (!response.ok) {
        throw new Error("No se pudo obtener la lista de Pokémon.");
      }
      const data = await response.json();
      setPokemonList(data.results);
      fetchPokemonDetails(data.results);
    } catch (err) {
      setError("Error al cargar la lista de Pokémon.");
      setLoading(false);
    }
  };
  
  
  // Función para obtener los detalles de cada Pokémon
  const fetchPokemonDetails = async (pokemonList: Pokemon[]) => {
    try {
      const details = await Promise.all(
        pokemonList.map(async (pokemon) => {
          const response = await fetch(pokemon.url);
          if (!response.ok) {
            throw new Error(`No se pudo obtener los detalles de ${pokemon.name}.`);
          }
          return response.json();
        })
      );
      setPokemonDetails(details);
    } catch (err) {
      setError("Error al cargar los detalles de los Pokémon.");
    } finally {
      setLoading(false);
    }
  };

  // Ejecutar la función al montar el componente
  useEffect(() => {
    fetchPokemonList();
  }, []);

  if (loading) {
    return <p className="text-center text-lg">Cargando Pokémon...</p>;
  }

  if (error) {
    return <p className="text-center text-red-500 font-bold">{error}</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold text-center mb-8">Lista de Pokémon</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {pokemonDetails.map((pokemon) => (
          <div
            key={pokemon.name}
            className="bg-white rounded-lg shadow-md p-4 text-center hover:shadow-lg transition-shadow"
          >
            <img
              src={pokemon.sprites.front_default}
              alt={pokemon.name}
              className="w-24 h-24 mx-auto"
            />
            <h2 className="text-xl font-semibold mt-2">
              {pokemon.name.toUpperCase()}
            </h2>
            <p className="text-gray-600">
              Tipo(s):{" "}
              {pokemon.types.map((type) => type.type.name).join(", ")}
            </p>
            <p className="text-gray-600">Peso: {pokemon.weight / 10} kg</p>
            <p className="text-gray-600">Altura: {pokemon.height / 10} m</p>
            
            <div className="mt-2">
              <h3 className="font-semibold">Habilidades:</h3>
              <ul className="text-sm">
                {pokemon.abilities.map((ability) => (
                  <li key={ability.ability.name}>
                    {ability.ability.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

