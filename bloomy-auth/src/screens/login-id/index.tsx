import BloomyLogo from "@/components/BloomyLogo";
import ULThemeSeparator from "@/components/ULThemeSeparator";
import { extractTokenValue } from "@/utils/helpers/tokenUtils";
import { applyAuth0Theme } from "@/utils/theme/themeEngine";

import AlternativeLogins from "./components/AlternativeLogins";
import Footer from "./components/Footer";
import Header from "./components/Header";
import LoginIdForm from "./components/LoginIdForm";
import { useLoginIdManager } from "./hooks/useLoginIdManager";

function LoginIdScreen() {
  const { loginId, texts, locales, isPasskeyEnabled, alternateConnections } =
    useLoginIdManager();

  const showSeparator =
    isPasskeyEnabled ||
    (alternateConnections && alternateConnections.length > 0);

  const separatorText = texts?.separatorText || locales?.page?.orText;
  document.title = texts?.pageTitle || locales?.page?.title || "Bloomy";

  applyAuth0Theme(loginId);

  const socialLoginAlignment = extractTokenValue(
    "--ul-theme-widget-social-buttons-layout"
  );

  const renderSocialLogins = (alignment: "top" | "bottom") => (
    <>
      {alignment === "bottom" && showSeparator && (
        <ULThemeSeparator text={separatorText} />
      )}
      <AlternativeLogins />
      {alignment === "top" && showSeparator && (
        <ULThemeSeparator text={separatorText} />
      )}
    </>
  );

  return (
    <main className="bloomy-auth-shell theme-universal">
      <section className="bloomy-auth-story">
        <div className="bloomy-brand-row">
          <BloomyLogo />
          <span>Bloomy</span>
        </div>

        <div className="bloomy-story-copy">
          <p className="bloomy-kicker">Community health signals</p>
          <h1>Report early. Respond faster.</h1>
          <p>
            Bloomy helps people, farmers, clinicians, and environmental teams
            catch local health patterns before they spread.
          </p>
        </div>

        <div className="bloomy-proof-grid" aria-label="Bloomy capabilities">
          <span>Live reports</span>
          <span>AI summaries</span>
          <span>Local alerts</span>
        </div>
      </section>

      <section className="bloomy-auth-panel">
        <div className="bloomy-auth-card">
          <Header />
          {socialLoginAlignment === "top" && renderSocialLogins("top")}
          <LoginIdForm />
          <Footer />
          {socialLoginAlignment === "bottom" && renderSocialLogins("bottom")}
        </div>
      </section>
    </main>
  );
}

export default LoginIdScreen;
