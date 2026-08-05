import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AssetLabsLogo } from "@/components/brand/AssetLabsLogo";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 text-center text-white">
      <AssetLabsLogo size="lg" showText className="mb-10" />

      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">404</p>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Page not found</h1>
      <p className="mt-3 max-w-md text-gray-400">
        The page you're looking for doesn't exist or has moved. Start from the beginning and explore
        the platform instead.
      </p>

      <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          onClick={() => navigate("/auth", { state: { mode: "signup" } })}
          className="h-11 bg-cyan-400 px-6 font-semibold text-black hover:bg-cyan-300"
        >
          Get started free
        </Button>
        <Button asChild variant="ghost" className="h-11 px-6 text-gray-300 hover:text-white">
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
