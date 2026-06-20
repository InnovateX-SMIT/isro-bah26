"""
Static Scientific Knowledge Base for Regional-to-Environmental Classifications.
Decouples data structure matrices from services rule processing engines.
"""

REGIONAL_CONTEXT_MAPPINGS = {
    "indo-gangetic plain": {
        "terrain_type": "Alluvial Plain",
        "environment_type": "Agricultural Landscape",
        "dominant_landscape": "Cultivated Agricultural Fields",
        "hydrology_context": "River-influenced plain with drainage networks",
        "agricultural_context": "High agricultural activity with extensive irrigation",
        "urbanization_context": "Low to Moderate",
        "regional_characteristics": [
            "Seasonal vegetation cycles",
            "Irrigation canal presence",
            "High agricultural utilization",
            "Flat topography with minor slope variations"
        ]
    },
    "deccan plateau": {
        "terrain_type": "Semiarid Plateau",
        "environment_type": "Semi-Arid Scrub and Agricultural Landscape",
        "dominant_landscape": "Cultivated Fields and Open Scrublands",
        "hydrology_context": "Rain-fed drainage basins and seasonal reservoirs",
        "agricultural_context": "Moderate agricultural activity dependent on monsoon and wells",
        "urbanization_context": "Moderate",
        "regional_characteristics": [
            "Undulating scrub terrain",
            "Black cotton soil presence",
            "Rain-fed crop patterns",
            "Rocky outcroppings"
        ]
    },
    "thar desert": {
        "terrain_type": "Arid Sandy Plain",
        "environment_type": "Arid Desert Landscape",
        "dominant_landscape": "Sand Dunes and Desert Scrublands",
        "hydrology_context": "Ephemeral streams and groundwater dependence",
        "agricultural_context": "Low agricultural activity, restricted to canal zones",
        "urbanization_context": "Low",
        "regional_characteristics": [
            "Sparse drought-resistant vegetation",
            "Aeolian sand dune formations",
            "High thermal variance",
            "Low population density"
        ]
    },
    "himalayan region": {
        "terrain_type": "High Alpine Mountainous",
        "environment_type": "Alpine Montane Forest and Valley Landscape",
        "dominant_landscape": "Mountain Slopes and River Valleys",
        "hydrology_context": "Glacial rivers and high-gradient runoff",
        "agricultural_context": "Low to Moderate (restricted terrace farming)",
        "urbanization_context": "Low",
        "regional_characteristics": [
            "Steep terrain elevation profiles",
            "Coniferous dense canopy cover",
            "High rainfall and snow accumulations",
            "Terraced agricultural layouts"
        ]
    },
    "western coastal zone": {
        "terrain_type": "Coastal Plain and Foothills",
        "environment_type": "Humid Coastal and Estuarine Landscape",
        "dominant_landscape": "Estuaries, Coastal Marshes, and Plantations",
        "hydrology_context": "High-density westward flowing rivers and backwaters",
        "agricultural_context": "High agricultural activity (plantation crops, paddy)",
        "urbanization_context": "Moderate to High",
        "regional_characteristics": [
            "Coastal and estuarine wetlands",
            "High tropical vegetation canopy density",
            "Extreme monsoon precipitation cycles",
            "Marine and aquaculture influence"
        ]
    },
    "eastern coastal zone": {
        "terrain_type": "Coastal Deltaic Plain",
        "environment_type": "Deltaic Wetland and Agricultural Landscape",
        "dominant_landscape": "River Deltas, Mangroves, and Paddy Fields",
        "hydrology_context": "Large river delta channels and coastal lagoons",
        "agricultural_context": "Very High agricultural activity (intensive paddy farming)",
        "urbanization_context": "Moderate",
        "regional_characteristics": [
            "Intense river delta branches",
            "Low-lying mudflats and mangrove wetlands",
            "Cyclone-prone coastal buffers",
            "High density canal layouts"
        ]
    },
    "central highlands": {
        "terrain_type": "Dissected Tableland and Hills",
        "environment_type": "Dry Deciduous Forest and Plateau Landscape",
        "dominant_landscape": "Plateau Hills and Cultivated Valleys",
        "hydrology_context": "River headwaters and hilly stream systems",
        "agricultural_context": "Moderate agricultural activity",
        "urbanization_context": "Low to Moderate",
        "regional_characteristics": [
            "Dissected plateau hills",
            "Deciduous forest tracts",
            "Mixed agriculture and forest boundaries",
            "Weathered rock formations"
        ]
    },
    "brahmaputra valley": {
        "terrain_type": "Floodplain and Marshy Plain",
        "environment_type": "Humid Valley and Wetlands Landscape",
        "dominant_landscape": "Braided River Channels and Floodplains",
        "hydrology_context": "Braided river channels and alluvial wetlands",
        "agricultural_context": "High agricultural activity (tea estates, paddy)",
        "urbanization_context": "Low to Moderate",
        "regional_characteristics": [
            "Wide braided river systems",
            "Frequent alluvial flooding cycles",
            "Tea plantation landscape blocks",
            "High biodiversity wetland zones"
        ]
    },
    "northeastern highlands": {
        "terrain_type": "Dissected Hilly Mountains",
        "environment_type": "Humid Tropical Forest and Hill Landscape",
        "dominant_landscape": "Dense Jungles and Hilly Ridges",
        "hydrology_context": "High-velocity hill streams",
        "agricultural_context": "Low agricultural activity (shifting/slash-and-burn farming)",
        "urbanization_context": "Low",
        "regional_characteristics": [
            "High canopy dense evergreen forests",
            "Steep ridge and valley layouts",
            "High landslide susceptibility",
            "Slash-and-burn agricultural remnants"
        ]
    },
    "shillong plateau": {
        "terrain_type": "Hilly Tableland Plateau",
        "environment_type": "Subtropical Pine Forest and Hilly Landscape",
        "dominant_landscape": "Plateau Meadows, Gorges, and Pine Forests",
        "hydrology_context": "Extreme precipitation runoff and karst springs",
        "agricultural_context": "Moderate agricultural activity (horticulture, hill crops)",
        "urbanization_context": "Moderate",
        "regional_characteristics": [
            "Extreme annual precipitation zones",
            "Pine forest and grassland meadow mosaics",
            "Deep river gorges and cliffs",
            "Karst cave formations"
        ]
    }
}

DEFAULT_CONTEXT = {
    "terrain_type": "Alluvial Plain",
    "environment_type": "Agricultural Landscape",
    "dominant_landscape": "Cultivated Agricultural Fields",
    "hydrology_context": "River-influenced plain with drainage networks",
    "agricultural_context": "High agricultural activity with extensive irrigation",
    "urbanization_context": "Low to Moderate",
    "regional_characteristics": [
        "Seasonal vegetation cycles",
        "Irrigation canal presence",
        "High agricultural utilization",
        "Flat topography with minor slope variations"
    ]
}
