import { AssetLabsLoader } from './AssetLabsLoader';

export const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <AssetLabsLoader message="Loading page..." size="md" />
  </div>
);
