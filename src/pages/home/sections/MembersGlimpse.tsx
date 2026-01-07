import './MembersGlimpse.css';
import ResponsiveGallery from '../../../components/gallery/ResponsiveGallery';

export default function MembersGlimpse() {
    return (
        <section className="members-glimpse">
            <div className="members-glimpse__header">
                <h2 className="members-glimpse__heading">Members Glimpse</h2>
                <p className="members-glimpse__subheading">The People Behind OrbitX</p>
            </div>
            <div className="members-glimpse__container">
                <ResponsiveGallery
                    overlayBlurColor="#000000"
                    grayscale={false}
                    imageBorderRadius="20px"
                    openedImageBorderRadius="24px"
                    fit={0.6}
                    minRadius={400}
                    maxVerticalRotationDeg={0}
                    autoRotate={true}
                    autoRotateSpeed={0.05}
                    maxItems={12}
                    showExploreMore={true}
                />
            </div>
        </section>
    );
}
