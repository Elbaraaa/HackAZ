import BloomyLogo from "@/components/BloomyLogo";

function Header() {
  return (
    <header className="bloomy-login-header">
      <div className="bloomy-logo-lockup">
        <BloomyLogo />
        <span>Bloomy</span>
      </div>

      <p className="bloomy-eyebrow">Secure access</p>
      <h1>Welcome back</h1>
      <p>
        Sign in to view local signals, report incidents, and track community
        health updates.
      </p>
    </header>
  );
}

export default Header;
