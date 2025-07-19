import { NowRequest, NowResponse } from "@vercel/node";
import { getCodeforces } from "../../../utils/getCodeforces";
import {
  getErrorSvg,
  getSuccessSvg,
} from "../../../utils/Cards/getCodeforcesCard";
import { getTheme } from "../../../utils/getTheme";

export default async (req: NowRequest, res: NowResponse) => {
  const { username, theme } = req.query;

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "public, max-age=1800");

  try {
    if (!username) {
      // user did not enter username
      return res.send(
        getErrorSvg("please enter a username (ex: username=codeforcesUser)")
      );
    }

    const user = username as string;
    const userTheme = theme
      ? getTheme((theme as string).toLowerCase())
      : getTheme("light");

    if (userTheme.value === "unknown") {
      // user entered invalid theme
      return res.send(getErrorSvg("please enter a valid theme"));
    }
    const stats = await getCodeforces(user);

    if (stats.status === "OK") {
      console.log("stats", stats);

      return res.send(
        getSuccessSvg({ stats, username: user, theme: userTheme })
      );
    } else {
      // user does not exist
      return res.send(getErrorSvg("User Not Exist"));
    }
  } catch {
    // unknown backend error
    return res.send(getErrorSvg("backend error occurred"));
  }
};
