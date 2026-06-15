'use client';

// Mixed breeds use the same BreedDetail component as pedigree breeds
import BreedDetail from "@/components/BreedDetail";

export default function MixedBreedDetailPage({ params }: { params: { slug: string } }) {
  return <BreedDetail breedType="Mixed" />;
}

