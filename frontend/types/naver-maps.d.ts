// Naver Maps API 타입 정의
declare namespace naver.maps {
  export class Map {
    constructor(element: HTMLElement, options?: MapOptions);
    setCenter(center: LatLng | Coord): void;
    getCenter(): LatLng;
    setZoom(zoom: number): void;
    getZoom(): number;
    panTo(center: LatLng | Coord): void;
  }

  export interface MapOptions {
    center?: LatLng | Coord;
    zoom?: number;
    zoomControl?: boolean;
    zoomControlOptions?: ZoomControlOptions;
  }

  export interface ZoomControlOptions {
    position?: Position;
  }

  export enum Position {
    TOP_LEFT = 1,
    TOP_CENTER = 2,
    TOP_RIGHT = 3,
    LEFT_CENTER = 4,
    CENTER = 5,
    RIGHT_CENTER = 6,
    BOTTOM_LEFT = 7,
    BOTTOM_CENTER = 8,
    BOTTOM_RIGHT = 9,
  }

  export class LatLng {
    constructor(lat: number, lng: number);
    lat(): number;
    lng(): number;
  }

  export interface Coord {
    lat: number;
    lng: number;
  }

  export class Size {
    constructor(width: number, height: number);
    width: number;
    height: number;
  }

  export class Point {
    constructor(x: number, y: number);
    x: number;
    y: number;
  }

  export class Marker {
    constructor(options: MarkerOptions);
    setMap(map: Map | null): void;
    getPosition(): LatLng;
    setPosition(position: LatLng | Coord): void;
  }

  export interface MarkerOptions {
    map?: Map;
    position: LatLng | Coord;
    icon?: Icon;
    zIndex?: number;
  }

  export interface Icon {
    content: string;
    size?: Size;
    anchor?: Point;
  }

  export class Circle {
    constructor(options: CircleOptions);
    setMap(map: Map | null): void;
    getCenter(): LatLng;
    setCenter(center: LatLng | Coord): void;
    getRadius(): number;
    setRadius(radius: number): void;
  }

  export interface CircleOptions {
    map?: Map;
    center: LatLng | Coord;
    radius: number;
    fillColor?: string;
    fillOpacity?: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
  }

  export class OverlayView {
    onAdd?(): void;
    onRemove?(): void;
    draw?(): void;
    setMap(map: Map | null): void;
    getProjection(): Projection;
  }

  export interface Projection {
    fromCoordToOffset(coord: LatLng): Point;
    fromOffsetToCoord(offset: Point): LatLng;
  }
}

declare var naver: {
  maps: typeof naver.maps;
};
