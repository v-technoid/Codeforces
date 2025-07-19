import React from "react";
import styles from "../src/styles/Header.module.css";
import Link from "next/link";

const Header = () => {
  return (
    <div style={{ backgroundColor: "black" }}>
      <div className={styles.main}>
        <div className={styles.Container}>
          <div>
              Codeforces
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
