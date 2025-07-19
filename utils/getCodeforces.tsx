import axios from "axios";

const ENDPOINT = "https://codeforces.com/api/user.info?handles=";

export interface StatsResponse {
  status: string;
  country?: string;
  contribution?: number;
  lastOnlineTimeSeconds?: number;
  friendOfCount?: number;
  titlePhoto?: string;
  rating?: string;
  rank?: string;
  maxRating?: number;
  maxRank?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  organization?: string;
  contributionPoints?: number;
  reputation?: number;
  maxContributionPoints?: number;
  maxReputation?: number;
  maxReputationPoints?: number;
  maxReputationTimeSeconds?: number;
  handle?: string;
  avatar?: string;
  registrationTimeSeconds?: number;
}

export const getCodeforces = async (
  username: string
): Promise<StatsResponse> => {
  try {
    const response = await axios.get(`${ENDPOINT}${username}`, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
    // console.log();
    return { ...response.data.result[0], status: "OK" } as StatsResponse;
  } catch {
    const errMsg = "could not reach backend, try again later.";
    return { status: "error" };
  }
};