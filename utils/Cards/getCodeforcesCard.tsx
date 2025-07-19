import { StatsResponse } from "../getCodeforces";
import { ThemeType } from "../../static/theme";

export interface SvgInfo {
  stats: StatsResponse;
  username: string;
  theme: ThemeType;
}
export const getSuccessSvg = (info: SvgInfo): string => {
  const { stats, username, theme } = info;
  const {
    status = "NA",
    contribution = "NA",
    rating = "NA",
    rank = "NA",
    maxRating = "NA",
    maxRank = "NA",
    firstName = "NA",
    country = "NA",
    lastName = "NA",
    city = "NA",
    organization = "NA",
    contributionPoints = "NA",
    reputation = "NA",
    maxContributionPoints = "NA",
    maxReputation = "NA",
    maxReputationPoints = "NA",
    maxReputationTimeSeconds = "NA",
    lastOnlineTimeSeconds = "NA",
    friendOfCount = "NA",
    titlePhoto = "NA",
    handle = "NA",
    avatar = "NA",
    registrationTimeSeconds = "NA",
  } = stats;
  
  const { background, title, text, circle, easy, med, hard } = theme;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="495" height="275" viewBox="0 0 495 250" fill="none">
      <style>
      .header {
        font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif;
        fill: ${title};
        animation: fadeInAnimation 0.8s ease-in-out forwards;
      }
      
      .stat {
        font: 600 14px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
        fill: ${text};
      }

      .easy {
        fill: ${easy};
      }

      .medium {
        fill: ${med}
      }

      .hard {
        fill: ${hard}
      }
      
      .stagger {
        opacity: 0;
        animation: fadeInAnimation 0.3s ease-in-out forwards;
      }
      
      .acceptance-text {
        font: 800 24px 'Segoe UI', Ubuntu, Sans-Serif;
        fill: ${text};
        animation: scaleInAnimation 0.3s ease-in-out forwards;
      }
      
      .acceptance-title {
        font: 600 14px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
        fill: ${text};
        animation: scaleInAnimation 0.3s ease-in-out forwards;
      }

      .bold {
        font-weight: 700
      }
      
      .acceptance-circle-rim {
        stroke: ${circle};
        fill: none;
        stroke-width: 6;
        opacity: 0.2;
      }
      
      .acceptance-circle {
        stroke: ${circle};
        stroke-dasharray: 377;
        fill: none;
        stroke-width: 6;
        stroke-linecap: round;
        opacity: 0.8;
        transform-origin: -10px 8px;
        transform: rotate(-90deg);
        animation: acceptanceAnimation 1s forwards ease-in-out;
      }
      
      @keyframes acceptanceAnimation {
        from {
          stroke-dashoffset: 377;
        }
        to {
          stroke-dashoffset: ${contributionPoints};
        }
      }
      /* Animations */
      
      @keyframes scaleInAnimation {
        from {
          transform: translate(-5px, 5px) scale(0);
        }
        to {
          transform: translate(-5px, 5px) scale(1);
        }
      }
      
      @keyframes fadeInAnimation {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
      </style>
      <rect x="0.5" y="0.5" rx="4.5" height="99%" stroke="${background}" width="494" fill="${background}" stroke-opacity="1" />
      <g transform="translate(25, 35)">
        <g transform="translate(0, 0)">
          <text x="0" y="0" class="header">${username}'s Codeforces Stats</text>
        </g>
      </g>
      <g transform="translate(0, 55)">
        <g transform="translate(400, 47.5)">
          <circle class="acceptance-circle-rim" cx="-1" cy="8" r="60" />
          <circle class="acceptance-circle" cx="-10" cy="18" r="60" />
          <text class="acceptance-text" x="6" y="-12" alignment-baseline="central" dominant-baseline="central" text-anchor="middle"> ${contribution}</text>
          <text class="acceptance-title" x="2" y="20" alignment-baseline="central" dominant-baseline="central" text-anchor="middle"> contributions </text>
          </g>
        <svg x="0" y="0">
          <g transform="translate(0, 0)">
            <g class="stagger" style="animation-delay: 250ms" transform="translate(25, 0)">
              <text class="stat bold" y="12.5">Handle:</text>
              <text class="stat" x="100" y="12.5">${handle}</text>
            </g>
          </g>
          <g transform="translate(0, 25)">
            <g class="stagger" style="animation-delay: 350ms" transform="translate(25, 0)">
              <text class="stat bold" y="12.5"> Name: </text>
              <text class="stat" x="100" y="12.5">${firstName} ${lastName}</text>
            </g>
          </g>
          <g transform="translate(0, 50)">
            <g class="stagger" style="animation-delay: 450ms" transform="translate(25, 0)">
              <text class="stat bold" y="12.5"> City/Country: </text>
              <text class="stat" x="100" y="12.5">${city} / ${country}</text>
            </g>
          </g>
          <g transform="translate(0, 75)">
            <g class="stagger" style="animation-delay: 550ms" transform="translate(25, 0)">
              <text class="stat bold easy" y="12.5">Rank:</text>
              <text class="stat easy" x="100" y="12.5">${rank}</text>
            </g>
          </g>
          <g transform="translate(0, 100)">
            <g class="stagger" style="animation-delay: 650ms" transform="translate(25, 0)">
              <text class="stat bold medium" y="12.5">Rating:</text>
              <text class="stat medium" x="100" y="12.5">${rating} / max: ${maxRating}</text>
            </g>
          </g>
          <g transform="translate(0, 125)">
            <g class="stagger" style="animation-delay: 750ms" transform="translate(25, 0)">
              <text class="stat bold" y="12.5">Friends:</text>
              <text class="stat" x="100" y="12.5">${friendOfCount}</text>
            </g>
          </g>
          <g transform="translate(0, 150)">
            <g class="stagger" style="animation-delay: 850ms" transform="translate(25, 0)">
              <text class="stat bold" y="12.5"> Organization: </text>
              <text class="stat" x="100" y="12.5">${organization}</text>
            </g>
          </g>
        </svg>
      </g>
    </svg>
  `;
};

export const getErrorSvg = (errMsg: string): string => {
  return `
    <svg width="495" height="120" viewBox="0 0 495 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <style>
        .text { font: 600 16px 'Segoe UI', Ubuntu, Sans-Serif; fill: #d500f9 }
        .small { font: 600 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: #252525 }
        .gray { fill: #858585 }
      </style>
      <rect x="0.5" y="0.5" width="494" height="99%" rx="4.5" fill="#FFFEFE" stroke="#E4E2E2"/>
      <text x="25" y="45" class="text">Something went wrong!</text>
      <text x="25" y="55" class="text small">
        <tspan x="25" dy="18">${"User not Found"}</tspan>
      </text>
    </svg>
  `;
};