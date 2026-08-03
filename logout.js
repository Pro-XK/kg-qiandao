import { close_api, delay, send, startService } from "./utils/utils.js";
import { printBlue, printGreen, printRed, printYellow } from "./utils/colorOut.js";
import { hasSecretWriteToken, setRepoSecret } from "./utils/githubSecrets.js";
import { maskIdentifier, sanitizeForLog, shouldPrintSensitiveValue } from "./utils/safeLog.js";

async function logout() {
  const USERINFO = process.env.USERINFO;
  const USERID = process.env.USERID;

  if (!USERINFO) {
    throw new Error("USERINFO Secret 未配置");
  }
  const userinfo = JSON.parse(USERINFO);

  if (!USERID) {
    // 列出所有账号供选择
    printYellow("当前已登录账号：");
    userinfo.forEach((user, index) => {
      printBlue(`${index + 1}. userid: ${maskIdentifier(String(user.userid))}`);
    });
    printYellow("请在环境变量 USERID 中指定要退出的 userid 后重试");
    return;
  }

  const targetId = Number(USERID);
  const index = userinfo.findIndex(u => u.userid === targetId);
  if (index === -1) {
    printRed(`未找到 userid: ${maskIdentifier(USERID)}`);
    return;
  }

  userinfo.splice(index, 1);
  printGreen(`userid: ${maskIdentifier(USERID)} 已退出`);

  if (userinfo.length === 0) {
    printYellow("所有账号已退出，USERINFO 将清空");
    // 需要清空 secret，用空数组
    const userinfoJSON = "[]";
    if (hasSecretWriteToken()) {
      try {
        setRepoSecret("USERINFO", userinfoJSON);
        printGreen("secret <USERINFO> 已清空");
      } catch (error) {
        printRed("自动写入 secret <USERINFO> 出错");
      }
    }
    return;
  }

  const userinfoJSON = JSON.stringify(userinfo);
  if (hasSecretWriteToken()) {
    try {
      setRepoSecret("USERINFO", userinfoJSON);
      printGreen("secret <USERINFO> 更改成功");
    } catch (error) {
      printRed("自动写入 secret <USERINFO> 出错");
      console.dir(sanitizeForLog({ message: error.message }), { depth: null });
      if (shouldPrintSensitiveValue()) {
        printBlue(userinfoJSON);
      }
    }
  } else {
    printYellow("PAT 未配置，无法自动更新 Secret。请手动更新 USERINFO：");
    if (shouldPrintSensitiveValue()) {
      printBlue(userinfoJSON);
    }
  }
}
logout();
