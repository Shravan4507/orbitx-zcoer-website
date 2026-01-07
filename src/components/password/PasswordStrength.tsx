import './PasswordStrength.css';

type PasswordStrengthProps = {
    password: string;
};

type StrengthLevel = 'empty' | 'weak' | 'medium' | 'strong';

function calculateStrength(password: string): StrengthLevel {
    if (!password) return 'empty';

    let score = 0;

    // Length checks (updated requirements)
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

    // Strong requires all 4 main criteria: 8+ chars, uppercase, number, special
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (hasMinLength && hasUppercase && hasNumber && hasSpecial) {
        return 'strong';
    }

    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
}

const STRENGTH_CONFIG = {
    empty: { label: '', color: '', width: 0 },
    weak: { label: 'Weak', color: '#f87171', width: 33 },
    medium: { label: 'Medium', color: '#fbbf24', width: 66 },
    strong: { label: 'Strong', color: '#4ade80', width: 100 }
};

export default function PasswordStrength({ password }: PasswordStrengthProps) {
    const strength = calculateStrength(password);
    const config = STRENGTH_CONFIG[strength];

    if (strength === 'empty') return null;

    return (
        <div className="password-strength">
            <div className="password-strength__bar">
                <div
                    className="password-strength__fill"
                    style={{
                        width: `${config.width}%`,
                        backgroundColor: config.color
                    }}
                />
            </div>
            <span
                className="password-strength__label"
                style={{ color: config.color }}
            >
                {config.label}
            </span>
        </div>
    );
}
