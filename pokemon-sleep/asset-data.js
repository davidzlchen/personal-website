"use strict";
// Public names and game rarity values; independent of the private roster.
const sleepAssets = {
    "ingredients": {
        "Bean Sausage": "ingredients/sausage.png",
        "Fancy Apple": "ingredients/apple.png",
        "Fancy Egg": "ingredients/egg.png",
        "Fiery Herb": "ingredients/herb.png",
        "Glossy Avocado": "ingredients/avocado.png",
        "Greengrass Corn": "ingredients/corn.png",
        "Greengrass Soybeans": "ingredients/soybean.png",
        "Honey": "ingredients/honey.png",
        "Large Leek": "ingredients/leek.png",
        "Moomoo Milk": "ingredients/milk.png",
        "Plump Pumpkin": "ingredients/pumpkin.png",
        "Pure Oil": "ingredients/oil.png",
        "Rousing Coffee": "ingredients/coffee.png",
        "Slowpoke Tail": "ingredients/tail.png",
        "Snoozy Tomato": "ingredients/tomato.png",
        "Soft Potato": "ingredients/potato.png",
        "Soothing Cacao": "ingredients/cacao.png",
        "Tasty Mushroom": "ingredients/mushroom.png",
        "Warming Ginger": "ingredients/ginger.png"
    },
    "berries": {
        "Belue Berry": "berries/belue.png",
        "Bluk Berry": "berries/bluk.png",
        "Cheri Berry": "berries/cheri.png",
        "Chesto Berry": "berries/chesto.png",
        "Durin Berry": "berries/durin.png",
        "Figy Berry": "berries/figy.png",
        "Grepa Berry": "berries/grepa.png",
        "Leppa Berry": "berries/leppa.png",
        "Lum Berry": "berries/lum.png",
        "Mago Berry": "berries/mago.png",
        "Oran Berry": "berries/oran.png",
        "Pamtre Berry": "berries/pamtre.png",
        "Pecha Berry": "berries/pecha.png",
        "Persim Berry": "berries/persim.png",
        "Rawst Berry": "berries/rawst.png",
        "Sitrus Berry": "berries/sitrus.png",
        "Wiki Berry": "berries/wiki.png",
        "Yache Berry": "berries/yache.png"
    },
    "specialties": {
        "Berries": "badges/berry.png",
        "Ingredients": "badges/ingredient.png",
        "Skills": "badges/strength.png"
    },
    "subskills": {
        "Sleep EXP Bonus": "gold",
        "Helping Bonus": "gold",
        "Energy Recovery Bonus": "gold",
        "Dream Shard Bonus": "gold",
        "Research EXP Bonus": "gold",
        "Helping Speed S": "normal",
        "Helping Speed M": "silver",
        "Berry Finding S": "gold",
        "Inventory Up S": "normal",
        "Inventory Up M": "silver",
        "Skill Level Up S": "silver",
        "Ingredient Finder S": "normal",
        "Ingredient Finder M": "silver",
        "Skill Trigger S": "normal",
        "Skill Trigger M": "silver",
        "Skill Level Up M": "gold",
        "Inventory Up L": "silver"
    }
};

// Legendary species metadata from PokéAPI; Mythical is a separate classification.
// https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/pokemon_species.csv
const legendarySpecies = new Set([144, 145, 146, 150, 243, 244, 245, 249, 250, 377, 378, 379, 380, 381, 382, 383, 384, 480, 481, 482, 483, 484, 485, 486, 487, 488, 638, 639, 640, 641, 642, 643, 644, 645, 646, 716, 717, 718, 772, 773, 785, 786, 787, 788, 789, 790, 791, 792, 800, 888, 889, 890, 891, 892, 894, 895, 896, 897, 898, 905, 1001, 1002, 1003, 1004, 1007, 1008, 1014, 1015, 1016, 1017, 1024]);
