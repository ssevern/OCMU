
export interface BJCPStyleData {
  category: string;
  overallImpression: string;
  aroma: string;
  appearance: string;
  flavor: string;
  mouthfeel: string;
}

export interface TastingBeer {
  id: string;
  style: string;
  brewer: string;
  abv: string;
  ibu: string;
  description: string;
  bjcpData?: BJCPStyleData;
  flightPosition: number;
  registeredAt?: number;
}

export interface BeerFeedback {
  id: string;
  beerId: string;
  brewerName: string; 
  judgeName: string; 
  aroma: number;
  appearance: number;
  flavor: number;
  mouthfeel: number;
  overall: number;
  descriptors: string[];
  notes: string;
  timestamp: number;
}

export interface SessionRecord {
  id: string;
  date: string;
  winnerBrewer: string;
  winnerStyle: string;
  winnerScore: number;
  totalEntries: number;
}
