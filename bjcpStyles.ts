
export interface BJCPCategory {
  id: string;
  name: string;
  styles: string[];
}

export const BJCP_2021_STYLES: BJCPCategory[] = [
  { id: "1", name: "Standard American Beer", styles: ["1A. American Light Lager", "1B. American Lager", "1C. Cream Ale", "1D. American Wheat Beer"] },
  { id: "2", name: "International Lager", styles: ["2A. International Pale Lager", "2B. International Amber Lager", "2C. International Dark Lager"] },
  { id: "3", name: "Czech Lager", styles: ["3A. Czech Pale Lager", "3B. Czech Premium Pale Lager", "3C. Czech Amber Lager", "3D. Czech Dark Lager"] },
  { id: "4", name: "Pale Malty European Lager", styles: ["4A. Munich Helles", "4B. Festbier", "4C. Helles Bock"] },
  { id: "5", name: "Pale Bitter European Lager", styles: ["5A. German Leichtbier", "5B. Kölsch", "5C. German Helles Exportbier", "5D. German Pils"] },
  { id: "6", name: "Amber Malty European Lager", styles: ["6A. Märzen", "6B. Rauchbier", "6C. Dunkles Bock"] },
  { id: "7", name: "Amber Bitter European Lager", styles: ["7A. Vienna Lager", "7B. Altbier"] },
  { id: "8", name: "Dark European Lager", styles: ["8A. Munich Dunkel", "8B. Schwarzbier"] },
  { id: "9", name: "Strong European Beer", styles: ["9A. Doppelbock", "9B. Eisbock", "9C. Baltic Porter"] },
  { id: "10", name: "German Wheat Beer", styles: ["10A. Weissbier", "10B. Dunkles Weissbier", "10C. Weizenbock"] },
  { id: "11", name: "British Bitter", styles: ["11A. Ordinary Bitter", "11B. Best Bitter", "11C. Strong Bitter"] },
  { id: "12", name: "Pale Commonwealth Beer", styles: ["12A. British Golden Ale", "12B. Australian Sparkling Ale", "12C. English IPA"] },
  { id: "13", name: "Brown British Beer", styles: ["13A. Dark Mild", "13B. British Brown Ale", "13C. English Porter"] },
  { id: "14", name: "Scottish Ale", styles: ["14A. Scottish Light", "14B. Scottish Heavy", "14C. Scottish Export"] },
  { id: "15", name: "Irish Beer", styles: ["15A. Irish Red Ale", "15B. Irish Stout", "15C. Irish Extra Stout"] },
  { id: "16", name: "Dark British Beer", styles: ["16A. Sweet Stout", "16B. Oatmeal Stout", "16C. Tropical Stout", "16D. Foreign Extra Stout"] },
  { id: "17", name: "Strong British Ale", styles: ["17A. British Strong Ale", "17B. Old Ale", "17C. Wee Heavy", "17D. English Barley Wine"] },
  { id: "18", name: "Pale American Ale", styles: ["18A. Blonde Ale", "18B. American Pale Ale"] },
  { id: "19", name: "Amber and Brown American Beer", styles: ["19A. American Amber Ale", "19B. California Common", "19C. American Brown Ale"] },
  { id: "20", name: "American Porter and Stout", styles: ["20A. American Porter", "20B. American Stout", "20C. Imperial Stout"] },
  { id: "21", name: "IPA", styles: ["21A. American IPA", "21B. Specialty IPA", "21C. Hazy IPA"] },
  { id: "22", name: "Strong American Ale", styles: ["22A. Double IPA", "22B. American Strong Ale", "22C. American Barleywine", "22D. Wheatwine"] },
  { id: "23", name: "European Sour Ale", styles: ["23A. Berliner Weisse", "23B. Flanders Red Ale", "23C. Oud Bruin", "23D. Lambic", "23E. Gueuze", "23F. Fruit Lambic", "23G. Gose"] },
  { id: "24", name: "Belgian Ale", styles: ["24A. Witbier", "24B. Belgian Pale Ale", "24C. Bière de Garde"] },
  { id: "25", name: "Strong Belgian Ale", styles: ["25A. Belgian Blond Ale", "25B. Saison", "25C. Belgian Golden Strong Ale"] },
  { id: "26", name: "Trappist Ale", styles: ["26A. Trappist Single", "26B. Belgian Dubbel", "26C. Belgian Tripel", "26D. Belgian Dark Strong Ale"] },
  { id: "27", name: "Historical Beer", styles: ["27A. Historical Beer (specify)"] },
  { id: "28", name: "American Wild Ale", styles: ["28A. Brett Beer", "28B. Mixed-Fermentation Sour Beer", "28C. Wild Specialty Beer"] },
  { id: "29", name: "Fruit Beer", styles: ["29A. Fruit Beer", "29B. Fruit and Spice Beer", "29C. Specialty Fruit Beer"] },
  { id: "30", name: "Spiced Beer", styles: ["30A. Spice, Herb, or Vegetable Beer", "30B. Autumn Seasonal Beer", "30C. Winter Seasonal Beer", "30D. Specialty Spiced Beer"] },
  { id: "31", name: "Alternative Fermentables Beer", styles: ["31A. Alternative Grain Beer", "31B. Alternative Sugar Beer"] },
  { id: "32", name: "Smoked Beer", styles: ["32A. Classic Style Smoked Beer", "32B. Specialty Smoked Beer"] },
  { id: "33", name: "Wood Beer", styles: ["33A. Wood-Aged Beer", "33B. Specialty Wood-Aged Beer"] },
  { id: "34", name: "Specialty Beer", styles: ["34A. Commercial Specialty Beer", "34B. Mixed-Style Beer", "34C. Experimental Beer"] }
];
