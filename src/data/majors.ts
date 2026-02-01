// Engineering majors/branches for engineering colleges
// Non-engineering students can use "Other" option

export const majors = [
    // Core Engineering Branches
    "Computer Engineering",
    "Computer Science & Engineering",
    "Information Technology",
    "Electronics & Telecommunication Engineering",
    "Electronics Engineering",
    "Electrical Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Chemical Engineering",

    // Allied Engineering Branches
    "Instrumentation Engineering",
    "Automobile Engineering",
    "Aerospace Engineering",
    "Biomedical Engineering",
    "Biotechnology Engineering",
    "Agricultural Engineering",
    "Environmental Engineering",
    "Industrial Engineering",
    "Manufacturing Engineering",
    "Mechatronics Engineering",
    "Metallurgical Engineering",
    "Mining Engineering",
    "Petroleum Engineering",
    "Production Engineering",
    "Robotics Engineering",
    "Structural Engineering",
    "Textile Engineering",

    // Emerging Tech Branches
    "Artificial Intelligence",
    "Artificial Intelligence & Machine Learning",
    "Artificial Intelligence & Data Science",
    "Data Science",
    "Cyber Security",
    "Cloud Computing",
    "Internet of Things (IoT)",
    "Software Engineering",

    // Specialized Engineering
    "Electronics & Computer Engineering",
    "Electrical & Electronics Engineering",
    "Computer Science & Design",
    "Computer Science & Business Systems",
    "Information Science & Engineering",
    "Automation & Robotics",
] as const

export type Major = typeof majors[number]

// Helper function to search majors
export const searchMajors = (query: string): string[] => {
    if (!query.trim()) return [...majors]

    const lowerQuery = query.toLowerCase()
    return majors.filter(major =>
        major.toLowerCase().includes(lowerQuery)
    )
}
