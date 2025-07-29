/*
keywords that will be utilised across the platform for targeting

it's ideal to define the keywords as static and use this file in other places since it removes the network requirement

it is also possible to load the keywords at the start of the server (e.g. using an excel file or db). However, that option
may be restrictive when it comes to client side frontend.
*/

export interface keywordBase {
    slug: string, //slug of the keyword
    displayName?: string, // (optional) keyword as displayed in the frontend
    description?: string // (optional) description
}

export interface keywordCategory extends keywordBase {
    keywords: keywordBase[]
}

const keywordsFavBrands: keywordCategory = {
    slug: "fav_brands",
    displayName: "Favourite Brands",
    description: "Brands that the user likes",
    keywords: [
        {
            slug: "adidas",
            displayName: "Adidas"
        },
        {
            slug: "burberry",
            displayName: "Burberry"
        },
        {
            slug: "Cheerios",
            displayName: "Cheerios"
        },
        {
            slug: "Honey Stars",
            displayName: "Honey Stars"
        },
        {
            slug: "Milo cereals",
            displayName: "Milo cereals"
        },
        {
            slug: "Nestum",
            displayName: "Nestum"
        },
        {
            slug: "Quaker",
            displayName: "Quaker"
        },
        {
            slug: "Lay's",
            displayName: "Lay's"
        },
        {
            slug: "Cheetos",
            displayName: "Cheetos"
        }
    ]
}

const keywordsEthicalSocialValues: keywordCategory = {
    slug: "ethical_or_social_values",
    displayName: "Ethical/Social values",
    keywords: [
        {
            slug: "kindness",
            displayName: "Kindness"
        },
        {
            slug: "Caring",
            displayName: "Caring"
        },
        {
            slug: "Good will",
            displayName: "Good will"
        },
        {
            slug: "Tolerance",
            displayName: "Tolerance"
        },
        {
            slug: "Compassion/mercy",
            displayName: "Compassion/mercy"
        },
        {
            slug: "Adherence to the Golden Rule",
            displayName: "Adherence to the Golden Rule"
        },
        {
            slug: "Honesty",
            displayName: "Honesty"
        },
        {
            slug: "Accountability",
            displayName: "Accountability"
        },
        {
            slug: "Respect",
            displayName: "Respect"
        },
        {
            slug: "Reliability",
            displayName: "Reliability"
        },
        {
            slug: "Fairness",
            displayName: "Fairness"
        },
        {
            slug: "Leadership",
            displayName: "Leadership"
        },
        {
            slug: "Loyalty",
            displayName: "Loyalty"
        },
        {
            slug: "Dignity",
            displayName: "Dignity"
        },
        {
            slug: "Humanity",
            displayName: "Humanity"
        },
        {
            slug: "Justice",
            displayName: "Justice"
        },
        {
            slug: "Professionalism",
            displayName: "Professionalism"
        },
        {
            slug: "Trust",
            displayName: "Trust"
        }
    ]
}

const keywordsDietary: keywordCategory = {
    slug: "dietary",
    displayName: "Dietary",
    description: "user's dietary restrictions",
    keywords: [
        {
            slug: "Vegetarian",
            displayName: "Vegetarian"
        },
        {
            slug: "Pescetarian",
            displayName: "Pescetarian"
        },
        {
            slug: "Vegan",
            displayName: "Vegan"
        },
        {
            slug: "Lactose intolerance",
            displayName: "Lactose intolerance"
        },
        {
            slug: "Gluten intolerance",
            displayName: "Gluten intolerance"
        },
        {
            slug: "Dairy-free",
            displayName: "Dairy-free"
        },
        {
            slug: "Peanut allergies",
            displayName: "Peanut allergies"
        },
        {
            slug: "Kosher",
            displayName: "Kosher"
        },
        {
            slug: "Halal",
            displayName: "Halal"
        },
    ]
}

const keywordsEmploymentRole: keywordCategory = {
    slug: "employment_role",
    displayName: "Employment Role",
    description: "employment role user likes",
    keywords: [
        {
            slug: "Work from Home",
            displayName: "Work from Home"
        },
        {
            slug: "Director/Managerial",
            displayName: "Director/Managerial"
        },
        {
            slug: "Homemaker / Domestic Work",
            displayName: "Homemaker / Domestic Work"
        },
        {
            slug: "Office Worker",
            displayName: "Office Worker"
        },
        {
            slug: "Part-Time Worker",
            displayName: "Part-Time Worker"
        },
        {
            slug: "Professional",
            displayName: "Professional"
        },
        {
            slug: "Public Sector",
            displayName: "Public Sector"
        },
        {
            slug: "Retired",
            displayName: "Retired"
        },
        {
            slug: "Self Employed",
            displayName: "Self Employed"
        },
        {
            slug: "Shop Worker",
            displayName: "Shop Worker"
        },
        {
            slug: "Skilled/Manual Work",
            displayName: "Skilled/Manual Work"
        },
        {
            slug: "Student",
            displayName: "Student"
        },
        {
            slug: "Unemployed",
            displayName: "Unemployed"
        }
    ]
}

const keywordsHighestEducation: keywordCategory = {
    slug: "highest_education",
    displayName: "Highest Education",
    description: "Highest Education that the user likes",
    keywords: [
        {
            slug: "High School Certificate",
            displayName: "High School Certificate"
        },
        {
            slug: "Diploma",
            displayName: "Diploma"
        },
        {
            slug: "Bachelors",
            displayName: "Bachelors"
        },
        {
            slug: "Masters",
            displayName: "Masters"
        },
        {
            slug: "Doctorate",
            displayName: "Doctorate"
        },
        {
            slug: "Professional Certification",
            displayName: "Professional Certification"
        }
    ]
}

const keywordsAnnualIncomeRange: keywordCategory = {
    slug: "annual_income_range",
    displayName: "Annual Income Range (US$)",
    description: "Annual Income Range that the user likes",
    keywords: [
        {
            slug: "$0-$9,999",
            displayName: "$0-$9,999"
        },
        {
            slug: "$10,000-$14,999",
            displayName: "$10,000-$14,999"
        },
        {
            slug: "$15,000-$19,999",
            displayName: "$15,000-$19,999"
        },
        {
            slug: "$20000 - $39999",
            displayName: "$20000 - $39999"
        },
        {
            slug: "$40000 - $49999",
            displayName: "$40000 - $49999"
        },
        {
            slug: "$50000 - $74999",
            displayName: "$50000 - $74999"
        },
        {
            slug: "$75000 - $99999",
            displayName: "$75000 - $99999"
        },
        {
            slug: "$100000 - $149999",
            displayName: "$100000 - $149999"
        },
        {
            slug: "$150,000-$174,999",
            displayName: "$150,000-$174,999"
        },
        {
            slug: "$175,000-$199,999",
            displayName: "$175,000-$199,999"
        },
        {
            slug: "$200,000-$249,999",
            displayName: "$200,000-$249,999"
        },
        {
            slug: "$250,000+",
            displayName: "$250,000+"
        }
    ]
}

const keywordsAttitudeToRisk: keywordCategory = {
    slug: "attitude_to_risk",
    displayName: "Attitude To Risk",
    description: "Attitude To Risk",
    keywords: [
        {
            slug: "Conscientiousness",
            displayName: "Conscientiousness"
        },
        {
            slug: "Productivity",
            displayName: "Productivity"
        },
        {
            slug: "Reliability",
            displayName: "Reliability"
        },
        {
            slug: "Rule-adherence",
            displayName: "Rule-adherence"
        },
        {
            slug: "Competence",
            displayName: "Competence"
        },
        {
            slug: "Personality Traits",
            displayName: "Personality Traits"
        },
        {
            slug: "Emotional Intelligence",
            displayName: "Emotional Intelligence"
        }
    ]
}

// Can push more categories here (e.g. from excel or db)
export const allKeywordCategories: keywordCategory[] = [keywordsFavBrands, keywordsEthicalSocialValues, keywordsDietary, keywordsEmploymentRole, keywordsHighestEducation, keywordsAnnualIncomeRange, keywordsAttitudeToRisk]