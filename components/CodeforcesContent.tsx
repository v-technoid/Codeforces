import React, { useState, useRef } from "react";
import axios from "axios";
import { Grid, MenuItem, Typography, Paper, TextField, Button, Box, styled } from "@mui/material";
import BubbleChartIcon from "@mui/icons-material/BubbleChart";
import ImageIcon from "@mui/icons-material/Image";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { themes } from "../static/theme";

const ENDPOINT = "https://codeforces-markdown.vercel.app/";

const Container = styled(Paper)(() => ({
  width: "100%",
  maxWidth: "600px",
  padding: "24px",
  backgroundColor: "#1e1e2e",
  color: "white",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  borderRadius: "12px",
  boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.3)",
}));

const StatusText = styled(Typography)<{ status: string }>(({ status }) => ({
  color:
    status === "Successfully Generated" ? "#4CAF50" :
    status === "Backend Error has Occurred" || status === "Please enter the Username!" ? "#FF5252" :
    status === "Generating..." ? "#FFB74D" : "white", 
  fontWeight: "bold",
  marginTop: "8px",
}));

function CodeforcesContent(): JSX.Element {
  const nameRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState("Light");
  const [statusText, setStatusText] = useState("Waiting for the request");
  const [generated, setGenerated] = useState(false);
  const [svg, setSvg] = useState("");
  const [copiedMessage, setCopiedMessage] = useState("");

  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTheme(event.target.value);
  };

  const getValue = (): string => nameRef.current?.value || "";

  const genOnClick = () => {
    setGenerated(false);
    setStatusText("Generating...");
    const username = getValue();

    if (username === "") {
      setStatusText("Please enter the Username!");
      return;
    }

    axios
      .get(`${ENDPOINT}/api/codeforces?username=${username}&theme=${theme}`)
      .then((response) => {
        setSvg(response.data);
        setGenerated(true);
        setStatusText("Successfully Generated");
      })
      .catch(() => {
        setGenerated(false);
        setStatusText("Backend Error has Occurred");
      });
  };

  const copyToClipboard = (type: "img" | "md") => {
    const username = getValue();
    const url = `${ENDPOINT}/api/codeforces?username=${username}&theme=${theme.toLowerCase()}`;
    const text = type === "md" ? `![${username}'s Codeforces Stats](${url})` : url;

    navigator.clipboard.writeText(text);
    setCopiedMessage(type === "md" ? "Markdown copied!" : "Image URL copied!");

    setTimeout(() => {
      setCopiedMessage("");
    }, 3000);
  };

  return (
    <Grid container justifyContent="center" sx={{ minHeight: "100vh", alignItems: "center" }}>
      <Container elevation={10}>
        <Typography variant="h4" sx={{ mb: 2, color: "#90caf9", fontFamily: "Betatron, Regular" }}>
          Codeforces Stats
        </Typography>
        <TextField
          fullWidth
          label="Username"
          placeholder="Enter Codeforces username"
          inputRef={nameRef}
          InputProps={{ sx: { color: "white" } }}
          InputLabelProps={{ sx: { color: "#90caf9" } }}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          select
          label="Theme"
          value={theme}
          onChange={handleThemeChange}
          InputProps={{ sx: { color: "white" } }}
          InputLabelProps={{ sx: { color: "#90caf9" } }}
          sx={{ mb: 2 }}
        >
          {Object.keys(themes).map((key) => (
            <MenuItem key={themes[key as keyof typeof themes].value} value={themes[key as keyof typeof themes].value}>
              {themes[key as keyof typeof themes].value}
            </MenuItem>
          ))}
        </TextField>
        <Button
          variant="contained"
          startIcon={<AutoAwesomeIcon />}
          onClick={genOnClick}
          sx={{ mb: 2, bgcolor: "#90caf9", color: "black" }}
        >
          Generate
        </Button>
        <StatusText status={statusText}>{statusText}</StatusText>
        {generated && (
          <>
            <Box sx={{ mt: 2, mb: 2, p: 2, bgcolor: "#2e2e3e", borderRadius: "8px", width: "100%", textAlign: "center" }}>
              <div dangerouslySetInnerHTML={{ __html: svg }} />
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button variant="outlined" startIcon={<ImageIcon />} onClick={() => copyToClipboard("img")}>
                  Copy Image URL
                </Button>
                <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={() => copyToClipboard("md")}>
                  Copy Markdown
                </Button>
              </Box>
              {copiedMessage && (
                <Typography sx={{ color: "#4CAF50", fontWeight: "bold", mt: 1 }}>{copiedMessage}</Typography>
              )}
            </Box>
          </>
        )}
      </Container>
    </Grid>
  );
}

export default CodeforcesContent;
