import { RiskLevel } from '../constants/quality.constants.js';
import { BadRequestError } from '../../../common/errors/app-error.js';

export interface RiskCalculationResult {
  likelihood: number;
  severityRating: number;
  riskScore: number;
  riskLevel: RiskLevel;
}

export function calculateRisk(likelihood: number, severityRating: number): RiskCalculationResult {
  if (likelihood < 1 || likelihood > 5) {
    throw new BadRequestError(`Invalid risk likelihood: ${likelihood}. Must be an integer between 1 and 5.`);
  }
  if (severityRating < 1 || severityRating > 5) {
    throw new BadRequestError(`Invalid risk severityRating: ${severityRating}. Must be an integer between 1 and 5.`);
  }

  const riskScore = likelihood * severityRating;
  let riskLevel: RiskLevel = RiskLevel.LOW;

  if (riskScore >= 1 && riskScore <= 6) {
    riskLevel = RiskLevel.LOW;
  } else if (riskScore >= 7 && riskScore <= 12) {
    riskLevel = RiskLevel.MEDIUM;
  } else if (riskScore >= 13 && riskScore <= 19) {
    riskLevel = RiskLevel.HIGH;
  } else if (riskScore >= 20 && riskScore <= 25) {
    riskLevel = RiskLevel.CRITICAL;
  }

  return {
    likelihood,
    severityRating,
    riskScore,
    riskLevel,
  };
}
