import React from "react";
import styles from "../src/styles/Footer.module.css";

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.insideFooter}>
        <p className={styles.copyright}>
          &copy; {new Date().getFullYear()} Made by Vishnuppriyan PL
        </p>
        <p className={styles.contribute}>
          Wanna contribute? Check the documentation{" "}
          <a
            href="https://github.com/v-technoid/Codeforces_Markdown"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            here
          </a>.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
