import { useEffect, useMemo, useRef, useCallback } from 'react';
import { useGesture } from '@use-gesture/react';
import './DomeGallery.css';
import membersData from '../../data/members.json';

// Member type from JSON
type MemberAcademics = {
    year: string;
    branch: string;
    division: string;
    yearOfGraduation: string;
};

type MemberSocialLinks = {
    instagram?: string;
    linkedin?: string;
    github?: string;
    twitter?: string;
};

type MemberData = {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    team: string;
    position: string;
    academics: MemberAcademics;
    socialLinks: MemberSocialLinks;
    image: string;
};

type ImageItem = string | {
    src: string;
    alt?: string;
    name?: string;
    role?: string;
    bio?: string;
    team?: string;
    academics?: MemberAcademics;
    socialLinks?: MemberSocialLinks;
    dateOfBirth?: string;
};

type DomeGalleryProps = {
    images?: ImageItem[];
    fit?: number;
    fitBasis?: 'auto' | 'min' | 'max' | 'width' | 'height';
    minRadius?: number;
    maxRadius?: number;
    padFactor?: number;
    overlayBlurColor?: string;
    maxVerticalRotationDeg?: number;
    dragSensitivity?: number;
    enlargeTransitionMs?: number;
    segments?: number;
    dragDampening?: number;
    openedImageWidth?: string;
    openedImageHeight?: string;
    imageBorderRadius?: string;
    openedImageBorderRadius?: string;
    grayscale?: boolean;
    autoRotate?: boolean;
    autoRotateSpeed?: number;
    searchQuery?: string;
    teamFilter?: string;
    onExplore?: (member: { name: string; role: string; src: string; bio: string }) => void;
};

type ItemDef = {
    src: string;
    alt: string;
    name: string;
    role: string;
    bio: string;
    team: string;
    academics?: MemberAcademics;
    socialLinks?: MemberSocialLinks;
    dateOfBirth?: string;
    x: number;
    y: number;
    sizeX: number;
    sizeY: number;
};

// Transform members JSON data to ImageItem format
const transformMembersToImages = (members: MemberData[]): ImageItem[] => {
    // Get base URL from Vite (handles GitHub Pages subdirectory)
    const baseUrl = import.meta.env.BASE_URL || '/';

    return members
        .filter(m => m.firstName && m.lastName) // Only include members with names
        .map(member => {
            // Handle image path - if it's just a filename, prepend base + /members/
            // If it's a full path or URL, use as-is
            let imageSrc = '';
            if (member.image) {
                if (member.image.startsWith('http')) {
                    // External URL - use as-is
                    imageSrc = member.image;
                } else if (member.image.startsWith('/')) {
                    // Absolute path - prepend base URL
                    imageSrc = baseUrl + member.image.slice(1);
                } else {
                    // Just filename - serve from public/members folder
                    imageSrc = `${baseUrl}members/${member.image}`;
                }
            }

            return {
                src: imageSrc,
                alt: `${member.firstName} ${member.lastName}`,
                name: `${member.firstName} ${member.lastName}`,
                role: member.position,
                team: member.team,
                bio: '', // Could be added to JSON later
                academics: member.academics,
                socialLinks: member.socialLinks,
                dateOfBirth: member.dateOfBirth
            };
        });
};

// Use actual members data from JSON
const DEFAULT_IMAGES: ImageItem[] = transformMembersToImages(membersData.members as MemberData[]);

const DEFAULTS = {
    maxVerticalRotationDeg: 5,
    dragSensitivity: 20,
    enlargeTransitionMs: 300,
    segments: 35
};

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const normalizeAngle = (d: number) => ((d % 360) + 360) % 360;
const wrapAngleSigned = (deg: number) => {
    const a = (((deg + 180) % 360) + 360) % 360;
    return a - 180;
};
const getDataNumber = (el: HTMLElement, name: string, fallback: number) => {
    const attr = el.dataset[name] ?? el.getAttribute(`data-${name}`);
    const n = attr == null ? NaN : parseFloat(attr);
    return Number.isFinite(n) ? n : fallback;
};

function buildItems(pool: ImageItem[], seg: number): ItemDef[] {
    const xCols = Array.from({ length: seg }, (_, i) => -37 + i * 2);
    const evenYs = [-4, -2, 0, 2, 4];
    const oddYs = [-3, -1, 1, 3, 5];

    const coords = xCols.flatMap((x, c) => {
        const ys = c % 2 === 0 ? evenYs : oddYs;
        return ys.map(y => ({ x, y, sizeX: 2, sizeY: 2 }));
    });

    const totalSlots = coords.length;
    if (pool.length === 0) {
        return coords.map(c => ({ ...c, src: '', alt: '', name: '', role: '', bio: '', team: '', academics: undefined, socialLinks: undefined, dateOfBirth: undefined }));
    }
    if (pool.length > totalSlots) {
        console.warn(
            `[DomeGallery] Provided image count (${pool.length}) exceeds available tiles (${totalSlots}). Some images will not be shown.`
        );
    }

    const normalizedImages = pool.map(image => {
        if (typeof image === 'string') {
            return { src: image, alt: '', name: '', role: '', bio: '', team: '', academics: undefined, socialLinks: undefined, dateOfBirth: undefined };
        }
        return {
            src: image.src || '',
            alt: image.alt || '',
            name: image.name || '',
            role: image.role || '',
            bio: image.bio || '',
            team: image.team || '',
            academics: image.academics,
            socialLinks: image.socialLinks,
            dateOfBirth: image.dateOfBirth
        };
    });

    const usedImages = Array.from({ length: totalSlots }, (_, i) => normalizedImages[i % normalizedImages.length]);

    for (let i = 1; i < usedImages.length; i++) {
        if (usedImages[i].src === usedImages[i - 1].src) {
            for (let j = i + 1; j < usedImages.length; j++) {
                if (usedImages[j].src !== usedImages[i].src) {
                    const tmp = usedImages[i];
                    usedImages[i] = usedImages[j];
                    usedImages[j] = tmp;
                    break;
                }
            }
        }
    }

    return coords.map((c, i) => ({
        ...c,
        src: usedImages[i].src,
        alt: usedImages[i].alt,
        name: usedImages[i].name,
        role: usedImages[i].role,
        bio: usedImages[i].bio,
        team: usedImages[i].team,
        academics: usedImages[i].academics,
        socialLinks: usedImages[i].socialLinks,
        dateOfBirth: usedImages[i].dateOfBirth
    }));
}

function computeItemBaseRotation(offsetX: number, offsetY: number, sizeX: number, sizeY: number, segments: number) {
    const unit = 360 / segments / 2;
    const rotateY = unit * (offsetX + (sizeX - 1) / 2);
    const rotateX = unit * (offsetY - (sizeY - 1) / 2);
    return { rotateX, rotateY };
}

export default function DomeGallery({
    images = DEFAULT_IMAGES,
    fit = 0.5,
    fitBasis = 'auto',
    minRadius = 600,
    maxRadius = Infinity,
    padFactor = 0.25,
    overlayBlurColor = '#060010',
    maxVerticalRotationDeg = DEFAULTS.maxVerticalRotationDeg,
    dragSensitivity = DEFAULTS.dragSensitivity,
    enlargeTransitionMs = DEFAULTS.enlargeTransitionMs,
    segments = DEFAULTS.segments,
    dragDampening = 2,
    openedImageWidth = '400px',
    openedImageHeight = '400px',
    imageBorderRadius = '30px',
    openedImageBorderRadius = '30px',
    grayscale = true,
    autoRotate = false,
    autoRotateSpeed = 0.15,
    searchQuery = '',
    teamFilter = '',
    onExplore
}: DomeGalleryProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const mainRef = useRef<HTMLDivElement>(null);
    const sphereRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<HTMLDivElement>(null);
    const scrimRef = useRef<HTMLDivElement>(null);
    const focusedElRef = useRef<HTMLElement | null>(null);
    const originalTilePositionRef = useRef<{
        left: number;
        top: number;
        width: number;
        height: number;
    } | null>(null);

    const rotationRef = useRef({ x: 0, y: 0 });
    const startRotRef = useRef({ x: 0, y: 0 });
    const startPosRef = useRef<{ x: number; y: number } | null>(null);
    const draggingRef = useRef(false);
    const movedRef = useRef(false);
    const inertiaRAF = useRef<number | null>(null);

    const openingRef = useRef(false);
    const openStartedAtRef = useRef(0);
    const lastDragEndAt = useRef(0);

    const scrollLockedRef = useRef(false);
    const lockScroll = useCallback(() => {
        if (scrollLockedRef.current) return;
        scrollLockedRef.current = true;
        document.body.classList.add('dg-scroll-lock');
    }, []);
    const unlockScroll = useCallback(() => {
        if (!scrollLockedRef.current) return;
        if (rootRef.current?.getAttribute('data-enlarging') === 'true') return;
        scrollLockedRef.current = false;
        document.body.classList.remove('dg-scroll-lock');
    }, []);

    const filteredImages = useMemo(() => {
        if (!teamFilter) return images;

        // Leadership position filters
        const leadershipPositions = ['President', 'Chairman', 'Secretary', 'Treasurer', 'Co-Treasurer'];

        return images.filter(img => {
            if (typeof img === 'string') return false;

            // Check if filtering by a leadership position
            if (leadershipPositions.includes(teamFilter)) {
                return img.role === teamFilter;
            }

            // Otherwise filter by team name
            return img.team === teamFilter;
        });
    }, [images, teamFilter]);

    const items = useMemo(() => buildItems(filteredImages.length > 0 ? filteredImages : images, segments), [filteredImages, images, segments]);

    const matchingItems = useMemo(() => {
        if (!searchQuery) return [];
        return items.filter(item =>
            item.name && item.name.toLowerCase().includes(searchQuery)
        );
    }, [items, searchQuery]);

    const uniqueMatchingNames = useMemo(() => {
        const names = new Set(matchingItems.map(item => item.name));
        return Array.from(names);
    }, [matchingItems]);

    const singleMatch = uniqueMatchingNames.length === 1 ? matchingItems[0] : null;
    const hasMatches = matchingItems.length > 0;



    const applyTransform = (xDeg: number, yDeg: number) => {
        const el = sphereRef.current;
        if (el) {
            el.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${xDeg}deg) rotateY(${yDeg}deg)`;
        }
    };

    const lockedRadiusRef = useRef<number | null>(null);

    useEffect(() => {
        const root = rootRef.current;
        if (!root) return;
        const ro = new ResizeObserver(entries => {
            const cr = entries[0].contentRect;
            const w = Math.max(1, cr.width),
                h = Math.max(1, cr.height);
            const minDim = Math.min(w, h),
                maxDim = Math.max(w, h),
                aspect = w / h;
            let basis: number;
            switch (fitBasis) {
                case 'min':
                    basis = minDim;
                    break;
                case 'max':
                    basis = maxDim;
                    break;
                case 'width':
                    basis = w;
                    break;
                case 'height':
                    basis = h;
                    break;
                default:
                    basis = aspect >= 1.3 ? w : minDim;
            }
            let radius = basis * fit;
            const heightGuard = h * 1.35;
            radius = Math.min(radius, heightGuard);
            radius = clamp(radius, minRadius, maxRadius);
            lockedRadiusRef.current = Math.round(radius);

            const viewerPad = Math.max(8, Math.round(minDim * padFactor));
            root.style.setProperty('--radius', `${lockedRadiusRef.current}px`);
            root.style.setProperty('--viewer-pad', `${viewerPad}px`);
            root.style.setProperty('--overlay-blur-color', overlayBlurColor);
            root.style.setProperty('--tile-radius', imageBorderRadius);
            root.style.setProperty('--enlarge-radius', openedImageBorderRadius);
            root.style.setProperty('--image-filter', grayscale ? 'grayscale(1)' : 'none');
            applyTransform(rotationRef.current.x, rotationRef.current.y);

            const enlargedOverlay = viewerRef.current?.querySelector('.enlarge') as HTMLElement;
            if (enlargedOverlay && frameRef.current && mainRef.current) {
                const frameR = frameRef.current.getBoundingClientRect();
                const mainR = mainRef.current.getBoundingClientRect();

                const hasCustomSize = openedImageWidth && openedImageHeight;
                if (hasCustomSize) {
                    const tempDiv = document.createElement('div');
                    tempDiv.style.cssText = `position: absolute; width: ${openedImageWidth}; height: ${openedImageHeight}; visibility: hidden;`;
                    document.body.appendChild(tempDiv);
                    const tempRect = tempDiv.getBoundingClientRect();
                    document.body.removeChild(tempDiv);

                    const centeredLeft = frameR.left - mainR.left + (frameR.width - tempRect.width) / 2;
                    const centeredTop = frameR.top - mainR.top + (frameR.height - tempRect.height) / 2;

                    enlargedOverlay.style.left = `${centeredLeft}px`;
                    enlargedOverlay.style.top = `${centeredTop}px`;
                } else {
                    enlargedOverlay.style.left = `${frameR.left - mainR.left}px`;
                    enlargedOverlay.style.top = `${frameR.top - mainR.top}px`;
                    enlargedOverlay.style.width = `${frameR.width}px`;
                    enlargedOverlay.style.height = `${frameR.height}px`;
                }
            }
        });
        ro.observe(root);
        return () => ro.disconnect();
    }, [
        fit,
        fitBasis,
        minRadius,
        maxRadius,
        padFactor,
        overlayBlurColor,
        grayscale,
        imageBorderRadius,
        openedImageBorderRadius,
        openedImageWidth,
        openedImageHeight
    ]);

    useEffect(() => {
        applyTransform(rotationRef.current.x, rotationRef.current.y);
    }, []);

    const autoRotateRAF = useRef<number | null>(null);
    const aligningRef = useRef(false);

    useEffect(() => {
        if (!autoRotate) {
            if (autoRotateRAF.current) {
                cancelAnimationFrame(autoRotateRAF.current);
                autoRotateRAF.current = null;
            }
            return;
        }

        if (singleMatch && !focusedElRef.current) {
            if (autoRotateRAF.current) {
                cancelAnimationFrame(autoRotateRAF.current);
                autoRotateRAF.current = null;
            }

            if (!aligningRef.current) {
                aligningRef.current = true;
                const { rotateY } = computeItemBaseRotation(singleMatch.x, singleMatch.y, singleMatch.sizeX, singleMatch.sizeY, segments);
                const targetY = -rotateY;
                const currentY = rotationRef.current.y;

                let diff = targetY - currentY;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;

                const alignAnimate = () => {
                    const remaining = targetY - rotationRef.current.y;
                    let delta = remaining;
                    if (delta > 180) delta -= 360;
                    if (delta < -180) delta += 360;

                    if (Math.abs(delta) < 0.1) {
                        rotationRef.current = { x: rotationRef.current.x, y: targetY };
                        applyTransform(rotationRef.current.x, targetY);
                        aligningRef.current = false;
                        return;
                    }

                    const step = delta * 0.08;
                    const nextY = wrapAngleSigned(rotationRef.current.y + step);
                    rotationRef.current = { x: rotationRef.current.x, y: nextY };
                    applyTransform(rotationRef.current.x, nextY);

                    autoRotateRAF.current = requestAnimationFrame(alignAnimate);
                };

                autoRotateRAF.current = requestAnimationFrame(alignAnimate);
            }
            return;
        }

        aligningRef.current = false;

        const animate = () => {
            if (draggingRef.current || focusedElRef.current || singleMatch) {
                autoRotateRAF.current = requestAnimationFrame(animate);
                return;
            }

            const nextY = wrapAngleSigned(rotationRef.current.y - autoRotateSpeed);
            rotationRef.current = { x: rotationRef.current.x, y: nextY };
            applyTransform(rotationRef.current.x, nextY);

            autoRotateRAF.current = requestAnimationFrame(animate);
        };

        autoRotateRAF.current = requestAnimationFrame(animate);

        return () => {
            if (autoRotateRAF.current) {
                cancelAnimationFrame(autoRotateRAF.current);
                autoRotateRAF.current = null;
            }
        };
    }, [autoRotate, autoRotateSpeed, singleMatch, segments]);

    const stopInertia = useCallback(() => {
        if (inertiaRAF.current) {
            cancelAnimationFrame(inertiaRAF.current);
            inertiaRAF.current = null;
        }
    }, []);

    const startInertia = useCallback(
        (vx: number, vy: number) => {
            const MAX_V = 1.4;
            let vX = clamp(vx, -MAX_V, MAX_V) * 80;
            let vY = clamp(vy, -MAX_V, MAX_V) * 80;

            let frames = 0;
            const d = clamp(dragDampening ?? 0.6, 0, 1);
            const frictionMul = 0.94 + 0.055 * d;
            const stopThreshold = 0.015 - 0.01 * d;
            const maxFrames = Math.round(90 + 270 * d);

            const step = () => {
                vX *= frictionMul;
                vY *= frictionMul;
                if (Math.abs(vX) < stopThreshold && Math.abs(vY) < stopThreshold) {
                    inertiaRAF.current = null;
                    return;
                }
                if (++frames > maxFrames) {
                    inertiaRAF.current = null;
                    return;
                }
                const nextX = clamp(rotationRef.current.x - vY / 200, -maxVerticalRotationDeg, maxVerticalRotationDeg);
                const nextY = wrapAngleSigned(rotationRef.current.y + vX / 200);
                rotationRef.current = { x: nextX, y: nextY };
                applyTransform(nextX, nextY);
                inertiaRAF.current = requestAnimationFrame(step);
            };
            stopInertia();
            inertiaRAF.current = requestAnimationFrame(step);
        },
        [dragDampening, maxVerticalRotationDeg, stopInertia]
    );

    useGesture(
        {
            onDragStart: ({ event }) => {
                if (focusedElRef.current) return;
                stopInertia();
                const evt = event as PointerEvent;
                draggingRef.current = true;
                movedRef.current = false;
                startRotRef.current = { ...rotationRef.current };
                startPosRef.current = { x: evt.clientX, y: evt.clientY };
            },
            onDrag: ({ event, last, velocity = [0, 0], direction = [0, 0], movement }) => {
                if (focusedElRef.current || !draggingRef.current || !startPosRef.current) return;

                const evt = event as PointerEvent;
                const dxTotal = evt.clientX - startPosRef.current.x;
                const dyTotal = evt.clientY - startPosRef.current.y;

                if (!movedRef.current) {
                    const dist2 = dxTotal * dxTotal + dyTotal * dyTotal;
                    if (dist2 > 16) movedRef.current = true;
                }

                const nextX = clamp(
                    startRotRef.current.x - dyTotal / dragSensitivity,
                    -maxVerticalRotationDeg,
                    maxVerticalRotationDeg
                );
                const nextY = wrapAngleSigned(startRotRef.current.y + dxTotal / dragSensitivity);

                if (rotationRef.current.x !== nextX || rotationRef.current.y !== nextY) {
                    rotationRef.current = { x: nextX, y: nextY };
                    applyTransform(nextX, nextY);
                }

                if (last) {
                    draggingRef.current = false;

                    let [vMagX, vMagY] = velocity;
                    const [dirX, dirY] = direction;
                    let vx = vMagX * dirX;
                    let vy = vMagY * dirY;

                    if (Math.abs(vx) < 0.001 && Math.abs(vy) < 0.001 && Array.isArray(movement)) {
                        const [mx, my] = movement;
                        vx = clamp((mx / dragSensitivity) * 0.02, -1.2, 1.2);
                        vy = clamp((my / dragSensitivity) * 0.02, -1.2, 1.2);
                    }

                    if (Math.abs(vx) > 0.005 || Math.abs(vy) > 0.005) {
                        startInertia(vx, vy);
                    }

                    if (movedRef.current) lastDragEndAt.current = performance.now();

                    movedRef.current = false;
                }
            }
        },
        { target: mainRef, eventOptions: { passive: true } }
    );

    const openItemFromElement = useCallback((el: HTMLElement) => {
        if (openingRef.current) return;
        openingRef.current = true;
        openStartedAtRef.current = performance.now();
        lockScroll();

        const parent = el.parentElement as HTMLElement;
        focusedElRef.current = el;
        el.setAttribute('data-focused', 'true');

        const offsetX = getDataNumber(parent, 'offsetX', 0);
        const offsetY = getDataNumber(parent, 'offsetY', 0);
        const sizeX = getDataNumber(parent, 'sizeX', 2);
        const sizeY = getDataNumber(parent, 'sizeY', 2);

        const parentRot = computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, segments);
        const parentY = normalizeAngle(parentRot.rotateY);
        const globalY = normalizeAngle(rotationRef.current.y);
        let rotY = -(parentY + globalY) % 360;
        if (rotY < -180) rotY += 360;
        const rotX = -parentRot.rotateX - rotationRef.current.x;
        parent.style.setProperty('--rot-y-delta', `${rotY}deg`);
        parent.style.setProperty('--rot-x-delta', `${rotX}deg`);

        const refDiv = document.createElement('div');
        refDiv.className = 'item__image item__image--reference';
        refDiv.style.opacity = '0';
        refDiv.style.transform = `rotateX(${-parentRot.rotateX}deg) rotateY(${-parentRot.rotateY}deg)`;
        parent.appendChild(refDiv);

        void refDiv.offsetHeight;

        const tileR = refDiv.getBoundingClientRect();
        const mainR = mainRef.current?.getBoundingClientRect();
        const frameR = frameRef.current?.getBoundingClientRect();

        if (!mainR || !frameR || tileR.width <= 0 || tileR.height <= 0) {
            openingRef.current = false;
            focusedElRef.current = null;
            parent.removeChild(refDiv);
            unlockScroll();
            return;
        }

        originalTilePositionRef.current = {
            left: tileR.left,
            top: tileR.top,
            width: tileR.width,
            height: tileR.height
        };

        el.style.visibility = 'hidden';
        (el.style as unknown as Record<string, number>).zIndex = 0;

        const overlay = document.createElement('div');
        overlay.className = 'enlarge';
        overlay.style.position = 'absolute';
        overlay.style.left = frameR.left - mainR.left + 'px';
        overlay.style.top = frameR.top - mainR.top + 'px';
        overlay.style.width = frameR.width + 'px';
        overlay.style.height = frameR.height + 'px';
        overlay.style.opacity = '0';
        overlay.style.zIndex = '30';
        overlay.style.willChange = 'transform, opacity';
        overlay.style.transformOrigin = 'top left';
        overlay.style.transition = `transform ${enlargeTransitionMs}ms ease, opacity ${enlargeTransitionMs}ms ease`;

        const rawSrc = parent.dataset.src || (el.querySelector('img') as HTMLImageElement)?.src || '';
        const memberName = parent.dataset.name || '';
        const memberRole = parent.dataset.role || '';
        const memberTeam = parent.dataset.team || '';
        const memberDateOfBirth = parent.dataset.dateOfBirth || '';

        // Parse JSON data attributes
        let memberAcademics: { year?: string; branch?: string; division?: string; yearOfGraduation?: string } = {};
        let memberSocialLinks: { instagram?: string; linkedin?: string; github?: string; twitter?: string } = {};

        try {
            if (parent.dataset.academics) {
                memberAcademics = JSON.parse(parent.dataset.academics);
            }
        } catch (e) { /* ignore parse errors */ }

        try {
            if (parent.dataset.socialLinks) {
                memberSocialLinks = JSON.parse(parent.dataset.socialLinks);
            }
        } catch (e) { /* ignore parse errors */ }

        const img = document.createElement('img');
        img.src = rawSrc;
        img.className = 'enlarge__img';
        overlay.appendChild(img);

        const infoOverlay = document.createElement('div');
        infoOverlay.className = 'enlarge__info';

        const infoContent = document.createElement('div');
        infoContent.className = 'enlarge__info-content';

        const nameEl = document.createElement('div');
        nameEl.className = 'enlarge__name';
        nameEl.textContent = memberName;

        const roleEl = document.createElement('div');
        roleEl.className = 'enlarge__role';
        roleEl.textContent = memberRole;

        infoContent.appendChild(nameEl);
        infoContent.appendChild(roleEl);
        infoOverlay.appendChild(infoContent);

        if (memberName) {
            const exploreBtn = document.createElement('button');
            exploreBtn.className = 'enlarge__explore-btn';
            exploreBtn.textContent = 'Explore';
            exploreBtn.onclick = (e) => {
                e.stopPropagation();

                // Add expanded class and hide button
                overlay.classList.add('enlarge--expanded');
                exploreBtn.style.display = 'none';

                // Create expanded content immediately - CSS handles the blend animation
                const expandedContent = document.createElement('div');
                expandedContent.className = 'enlarge__expanded';

                const leftPanel = document.createElement('div');
                leftPanel.className = 'enlarge__expanded-left';

                const expandedImg = document.createElement('img');
                expandedImg.src = rawSrc;
                expandedImg.className = 'enlarge__expanded-img';
                leftPanel.appendChild(expandedImg);

                const expandedNameRole = document.createElement('div');
                expandedNameRole.className = 'enlarge__expanded-info';

                const expName = document.createElement('div');
                expName.className = 'enlarge__expanded-name';
                expName.textContent = memberName;

                const expRole = document.createElement('div');
                expRole.className = 'enlarge__expanded-role';
                expRole.textContent = memberRole;

                expandedNameRole.appendChild(expName);
                expandedNameRole.appendChild(expRole);
                leftPanel.appendChild(expandedNameRole);

                const rightPanel = document.createElement('div');
                rightPanel.className = 'enlarge__expanded-right';

                // ===== DETAILS SECTION =====
                const detailsSection = document.createElement('div');
                detailsSection.className = 'enlarge__details-section';

                // Team Info
                if (memberTeam) {
                    const teamRow = document.createElement('div');
                    teamRow.className = 'enlarge__detail-row';
                    teamRow.innerHTML = `<span class="enlarge__detail-label">Team</span><span class="enlarge__detail-value">${memberTeam}</span>`;
                    detailsSection.appendChild(teamRow);
                }

                // Date of Birth
                if (memberDateOfBirth) {
                    const dobRow = document.createElement('div');
                    dobRow.className = 'enlarge__detail-row';
                    dobRow.innerHTML = `<span class="enlarge__detail-label">Date of Birth</span><span class="enlarge__detail-value">${memberDateOfBirth}</span>`;
                    detailsSection.appendChild(dobRow);
                }

                rightPanel.appendChild(detailsSection);

                // ===== ACADEMICS SECTION =====
                const hasAcademics = memberAcademics.year || memberAcademics.branch || memberAcademics.division || memberAcademics.yearOfGraduation;
                if (hasAcademics) {
                    const academicsTitle = document.createElement('div');
                    academicsTitle.className = 'enlarge__expanded-title';
                    academicsTitle.textContent = 'Academic Details';
                    rightPanel.appendChild(academicsTitle);

                    const academicsGrid = document.createElement('div');
                    academicsGrid.className = 'enlarge__academics-grid';

                    if (memberAcademics.year) {
                        const yearItem = document.createElement('div');
                        yearItem.className = 'enlarge__academic-item';
                        yearItem.innerHTML = `<span class="enlarge__academic-label">Year</span><span class="enlarge__academic-value">${memberAcademics.year}</span>`;
                        academicsGrid.appendChild(yearItem);
                    }

                    if (memberAcademics.branch) {
                        const branchItem = document.createElement('div');
                        branchItem.className = 'enlarge__academic-item';
                        branchItem.innerHTML = `<span class="enlarge__academic-label">Branch</span><span class="enlarge__academic-value">${memberAcademics.branch}</span>`;
                        academicsGrid.appendChild(branchItem);
                    }

                    if (memberAcademics.division) {
                        const divItem = document.createElement('div');
                        divItem.className = 'enlarge__academic-item';
                        divItem.innerHTML = `<span class="enlarge__academic-label">Division</span><span class="enlarge__academic-value">${memberAcademics.division}</span>`;
                        academicsGrid.appendChild(divItem);
                    }

                    if (memberAcademics.yearOfGraduation) {
                        const gradItem = document.createElement('div');
                        gradItem.className = 'enlarge__academic-item';
                        gradItem.innerHTML = `<span class="enlarge__academic-label">Graduation</span><span class="enlarge__academic-value">${memberAcademics.yearOfGraduation}</span>`;
                        academicsGrid.appendChild(gradItem);
                    }

                    rightPanel.appendChild(academicsGrid);
                }

                // ===== SOCIAL LINKS SECTION =====
                const hasSocialLinks = memberSocialLinks.instagram || memberSocialLinks.linkedin || memberSocialLinks.github || memberSocialLinks.twitter;
                if (hasSocialLinks) {
                    const socialTitle = document.createElement('div');
                    socialTitle.className = 'enlarge__expanded-title';
                    socialTitle.textContent = 'Connect';
                    rightPanel.appendChild(socialTitle);

                    const socialLinksContainer = document.createElement('div');
                    socialLinksContainer.className = 'enlarge__social-links';

                    if (memberSocialLinks.instagram) {
                        const igLink = document.createElement('a');
                        igLink.href = memberSocialLinks.instagram;
                        igLink.target = '_blank';
                        igLink.rel = 'noopener noreferrer';
                        igLink.className = 'enlarge__social-link enlarge__social-link--instagram';
                        igLink.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`;
                        igLink.onclick = (evt) => evt.stopPropagation();
                        socialLinksContainer.appendChild(igLink);
                    }

                    if (memberSocialLinks.linkedin) {
                        const liLink = document.createElement('a');
                        liLink.href = memberSocialLinks.linkedin;
                        liLink.target = '_blank';
                        liLink.rel = 'noopener noreferrer';
                        liLink.className = 'enlarge__social-link enlarge__social-link--linkedin';
                        liLink.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>`;
                        liLink.onclick = (evt) => evt.stopPropagation();
                        socialLinksContainer.appendChild(liLink);
                    }

                    if (memberSocialLinks.github) {
                        const ghLink = document.createElement('a');
                        ghLink.href = memberSocialLinks.github;
                        ghLink.target = '_blank';
                        ghLink.rel = 'noopener noreferrer';
                        ghLink.className = 'enlarge__social-link enlarge__social-link--github';
                        ghLink.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></svg>`;
                        ghLink.onclick = (evt) => evt.stopPropagation();
                        socialLinksContainer.appendChild(ghLink);
                    }

                    if (memberSocialLinks.twitter) {
                        const xLink = document.createElement('a');
                        xLink.href = memberSocialLinks.twitter;
                        xLink.target = '_blank';
                        xLink.rel = 'noopener noreferrer';
                        xLink.className = 'enlarge__social-link enlarge__social-link--x';
                        xLink.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
                        xLink.onclick = (evt) => evt.stopPropagation();
                        socialLinksContainer.appendChild(xLink);
                    }

                    rightPanel.appendChild(socialLinksContainer);
                }

                if (onExplore) {
                    const viewProfileBtn = document.createElement('button');
                    viewProfileBtn.className = 'enlarge__profile-btn';
                    viewProfileBtn.textContent = 'View Full Profile';
                    viewProfileBtn.onclick = (evt) => {
                        evt.stopPropagation();
                        onExplore({ name: memberName, role: memberRole, src: rawSrc, bio: '' });
                    };
                    rightPanel.appendChild(viewProfileBtn);
                }

                expandedContent.appendChild(leftPanel);
                expandedContent.appendChild(rightPanel);
                overlay.appendChild(expandedContent);
            };
            infoOverlay.appendChild(exploreBtn);
        }

        overlay.appendChild(infoOverlay);
        viewerRef.current!.appendChild(overlay);

        const tx0 = tileR.left - frameR.left;
        const ty0 = tileR.top - frameR.top;
        const sx0 = tileR.width / frameR.width;
        const sy0 = tileR.height / frameR.height;

        const validSx0 = isFinite(sx0) && sx0 > 0 ? sx0 : 1;
        const validSy0 = isFinite(sy0) && sy0 > 0 ? sy0 : 1;

        overlay.style.transform = `translate(${tx0}px, ${ty0}px) scale(${validSx0}, ${validSy0})`;

        setTimeout(() => {
            if (!overlay.parentElement) return;
            overlay.style.opacity = '1';
            overlay.style.transform = 'translate(0px, 0px) scale(1, 1)';
            rootRef.current?.setAttribute('data-enlarging', 'true');
        }, 16);

        const wantsResize = openedImageWidth || openedImageHeight;
        if (wantsResize) {
            const onFirstEnd = (ev: TransitionEvent) => {
                if (ev.propertyName !== 'transform') return;
                overlay.removeEventListener('transitionend', onFirstEnd);
                const prevTransition = overlay.style.transition;
                overlay.style.transition = 'none';
                const tempWidth = openedImageWidth || `${frameR.width}px`;
                const tempHeight = openedImageHeight || `${frameR.height}px`;
                overlay.style.width = tempWidth;
                overlay.style.height = tempHeight;
                const newRect = overlay.getBoundingClientRect();
                overlay.style.width = frameR.width + 'px';
                overlay.style.height = frameR.height + 'px';
                void overlay.offsetWidth;
                overlay.style.transition = `left ${enlargeTransitionMs}ms ease, top ${enlargeTransitionMs}ms ease, width ${enlargeTransitionMs}ms ease, height ${enlargeTransitionMs}ms ease`;
                const centeredLeft = frameR.left - mainR.left + (frameR.width - newRect.width) / 2;
                const centeredTop = frameR.top - mainR.top + (frameR.height - newRect.height) / 2;
                requestAnimationFrame(() => {
                    overlay.style.left = `${centeredLeft}px`;
                    overlay.style.top = `${centeredTop}px`;
                    overlay.style.width = tempWidth;
                    overlay.style.height = tempHeight;
                });
                const cleanupSecond = () => {
                    overlay.removeEventListener('transitionend', cleanupSecond);
                    overlay.style.transition = prevTransition;
                };
                overlay.addEventListener('transitionend', cleanupSecond, {
                    once: true
                });
            };
            overlay.addEventListener('transitionend', onFirstEnd);
        }
    }, [segments, enlargeTransitionMs, openedImageWidth, openedImageHeight, lockScroll, unlockScroll]);

    const onTileClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (draggingRef.current) return;
            if (movedRef.current) return;
            if (performance.now() - lastDragEndAt.current < 80) return;
            if (openingRef.current) return;
            openItemFromElement(e.currentTarget);
        },
        [openItemFromElement]
    );

    const onTilePointerUp = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (e.pointerType !== 'touch') return;
            if (draggingRef.current) return;
            if (movedRef.current) return;
            if (performance.now() - lastDragEndAt.current < 80) return;
            if (openingRef.current) return;
            openItemFromElement(e.currentTarget);
        },
        [openItemFromElement]
    );

    useEffect(() => {
        const scrim = scrimRef.current;
        if (!scrim) return;

        const close = () => {
            if (performance.now() - openStartedAtRef.current < 250) return;

            const el = focusedElRef.current;
            if (!el) return;
            const parent = el.parentElement as HTMLElement;
            const overlay = viewerRef.current?.querySelector('.enlarge') as HTMLElement | null;
            if (!overlay) return;

            const refDiv = parent.querySelector('.item__image--reference') as HTMLElement | null;

            const originalPos = originalTilePositionRef.current;
            if (!originalPos) {
                overlay.remove();
                if (refDiv) refDiv.remove();
                parent.style.setProperty('--rot-y-delta', `0deg`);
                parent.style.setProperty('--rot-x-delta', `0deg`);
                el.style.visibility = '';
                (el.style as unknown as Record<string, number>).zIndex = 0;
                focusedElRef.current = null;
                rootRef.current?.removeAttribute('data-enlarging');
                openingRef.current = false;
                unlockScroll();
                return;
            }

            const currentRect = overlay.getBoundingClientRect();
            const rootRect = rootRef.current!.getBoundingClientRect();

            const originalPosRelativeToRoot = {
                left: originalPos.left - rootRect.left,
                top: originalPos.top - rootRect.top,
                width: originalPos.width,
                height: originalPos.height
            };

            const overlayRelativeToRoot = {
                left: currentRect.left - rootRect.left,
                top: currentRect.top - rootRect.top,
                width: currentRect.width,
                height: currentRect.height
            };

            const animatingOverlay = document.createElement('div');
            animatingOverlay.className = 'enlarge-closing';
            animatingOverlay.style.cssText = `
        position: absolute;
        left: ${overlayRelativeToRoot.left}px;
        top: ${overlayRelativeToRoot.top}px;
        width: ${overlayRelativeToRoot.width}px;
        height: ${overlayRelativeToRoot.height}px;
        z-index: 9999;
        border-radius: var(--enlarge-radius, 32px);
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0,0,0,.35);
        transition: all ${enlargeTransitionMs}ms ease-out;
        pointer-events: none;
        margin: 0;
        transform: none;
      `;

            const originalImg = overlay.querySelector('img');
            if (originalImg) {
                const img = originalImg.cloneNode() as HTMLImageElement;
                img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
                animatingOverlay.appendChild(img);
            }

            overlay.remove();
            rootRef.current!.appendChild(animatingOverlay);

            void animatingOverlay.getBoundingClientRect();

            requestAnimationFrame(() => {
                animatingOverlay.style.left = originalPosRelativeToRoot.left + 'px';
                animatingOverlay.style.top = originalPosRelativeToRoot.top + 'px';
                animatingOverlay.style.width = originalPosRelativeToRoot.width + 'px';
                animatingOverlay.style.height = originalPosRelativeToRoot.height + 'px';
                animatingOverlay.style.opacity = '0';
            });

            const cleanup = () => {
                animatingOverlay.remove();
                originalTilePositionRef.current = null;

                if (refDiv) refDiv.remove();
                parent.style.transition = 'none';
                el.style.transition = 'none';

                parent.style.setProperty('--rot-y-delta', `0deg`);
                parent.style.setProperty('--rot-x-delta', `0deg`);

                requestAnimationFrame(() => {
                    el.style.visibility = '';
                    el.style.opacity = '0';
                    (el.style as unknown as Record<string, number>).zIndex = 0;
                    focusedElRef.current = null;
                    rootRef.current?.removeAttribute('data-enlarging');

                    requestAnimationFrame(() => {
                        parent.style.transition = '';
                        el.style.transition = 'opacity 300ms ease-out';

                        requestAnimationFrame(() => {
                            el.style.opacity = '1';
                            setTimeout(() => {
                                el.style.transition = '';
                                el.style.opacity = '';
                                openingRef.current = false;
                                if (!draggingRef.current && rootRef.current?.getAttribute('data-enlarging') !== 'true') {
                                    document.body.classList.remove('dg-scroll-lock');
                                }
                            }, 300);
                        });
                    });
                });
            };

            animatingOverlay.addEventListener('transitionend', cleanup, {
                once: true
            });
        };

        scrim.addEventListener('click', close);
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };
        window.addEventListener('keydown', onKey);

        return () => {
            scrim.removeEventListener('click', close);
            window.removeEventListener('keydown', onKey);
        };
    }, [enlargeTransitionMs, unlockScroll]);

    useEffect(() => {
        return () => {
            document.body.classList.remove('dg-scroll-lock');
        };
    }, []);

    return (
        <div
            ref={rootRef}
            className="sphere-root"
            style={
                {
                    ['--segments-x' as string]: segments,
                    ['--segments-y' as string]: segments,
                    ['--overlay-blur-color' as string]: overlayBlurColor,
                    ['--tile-radius' as string]: imageBorderRadius,
                    ['--enlarge-radius' as string]: openedImageBorderRadius,
                    ['--image-filter' as string]: grayscale ? 'grayscale(1)' : 'none'
                } as React.CSSProperties
            }
        >
            <main ref={mainRef} className="sphere-main">
                <div className="stage">
                    <div ref={sphereRef} className="sphere">
                        {items.map((it, i) => (
                            <div
                                key={`${it.x},${it.y},${i}`}
                                className="item"
                                data-src={it.src}
                                data-name={it.name}
                                data-role={it.role}
                                data-bio={it.bio}
                                data-team={it.team}
                                data-academics={it.academics ? JSON.stringify(it.academics) : ''}
                                data-social-links={it.socialLinks ? JSON.stringify(it.socialLinks) : ''}
                                data-date-of-birth={it.dateOfBirth || ''}
                                data-offset-x={it.x}
                                data-offset-y={it.y}
                                data-size-x={it.sizeX}
                                data-size-y={it.sizeY}
                                style={
                                    {
                                        ['--offset-x' as string]: it.x,
                                        ['--offset-y' as string]: it.y,
                                        ['--item-size-x' as string]: it.sizeX,
                                        ['--item-size-y' as string]: it.sizeY
                                    } as React.CSSProperties
                                }
                            >
                                <div
                                    className={`item__image${hasMatches && matchingItems.some(m => m.name === it.name && m.src === it.src) ? ' item__image--glow' : ''}`}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={it.alt || 'Open image'}
                                    onClick={onTileClick}
                                    onPointerUp={onTilePointerUp}
                                >
                                    <img src={it.src} draggable={false} alt={it.alt} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="overlay" />
                <div className="overlay overlay--blur" />
                <div className="edge-fade edge-fade--top" />
                <div className="edge-fade edge-fade--bottom" />

                <div className="viewer" ref={viewerRef}>
                    <div ref={scrimRef} className="scrim" />
                    <div ref={frameRef} className="frame" />
                </div>
            </main>
        </div>
    );
}
