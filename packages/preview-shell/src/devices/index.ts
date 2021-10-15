import device_iPhone_11_Portrait from '../assets/iPhone-11-Portrait.png';
import frame_iPhone_11_Portrait from '../assets/iPhone-11-Portrait.svg';

import device_iPhone_11_Landscape from '../assets/iPhone-11-Landscape.png';
import frame_iPhone_11_Landscape from '../assets/iPhone-11-Landscape.svg';

import device_iPad_Pro_13_Portrait from '../assets/iPad-Pro-13-Portrait.png';
import device_iPad_Pro_13_Landscape from '../assets/iPad-Pro-13-Landscape.png';

import device_MacBook_Pro_16 from '../assets/MacBook-Pro-16.png';

const isFirefox = /(firefox)/i.test(window.navigator.userAgent);

export interface DeviceFrame {
  photo: string;
  mask?: string;
}

export interface DeviceSpecs {
  name: string;
  width: number;
  height: number;
  bezels: { top: number; right: number; bottom: number; left: number };
  frames: Record<string, DeviceFrame>;
}

interface RawDeviceSpecs extends DeviceSpecs {
  aliases: string[];
  ratio: number;
}

export const devices: RawDeviceSpecs[] = [
  {
    name: 'iPhone 11',
    aliases: ['iPhone', 'iPhone 11', 'phone', 'mobile'],
    width: 828,
    height: 1792,
    ratio: 2,
    bezels: {
      top: 71,
      right: 76,
      bottom: 71,
      left: 75,
    },
    frames: {
      default: {
        photo: `url('${device_iPhone_11_Portrait}')`,
        mask: isFirefox
          ? `url('${frame_iPhone_11_Portrait}#mask')`
          : 'url("#device-iPhone-11-Portrait-mask")',
      },
      landscape: {
        photo: `url(${device_iPhone_11_Landscape})`,
        mask: isFirefox
          ? `url('${frame_iPhone_11_Landscape}#mask')`
          : 'url("#device-iPhone-11-Landscape-mask")',
      },
    },
  },
  {
    name: 'iPad Pro 12.9"',
    aliases: ['ipad', 'iPad', 'iPad Pro', 'tablet', 'tab'],
    width: 2048,
    height: 2732,
    ratio: 2,
    bezels: {
      top: 102,
      right: 101,
      bottom: 96,
      left: 96,
    },
    frames: {
      default: {
        photo: `url("${device_iPad_Pro_13_Portrait}")`,
        mask: 'inset(0 0 0 0 round 34px)',
      },
      landscape: {
        photo: `url("${device_iPad_Pro_13_Landscape}")`,
        mask: 'inset(0 0 0 0 round 34px)',
      },
    },
  },
  {
    name: 'MacBook Pro 16"',
    aliases: ['MacBook', 'MacBook Pro', 'Mac', 'laptop', 'mac', 'desktop'],
    width: 3072,
    height: 1920,
    ratio: 2,
    bezels: {
      top: 98,
      right: 419,
      bottom: 223,
      left: 419,
    },
    frames: {
      default: {
        photo: `url("${device_MacBook_Pro_16}")`,
      },
    },
  },
];

export default toMap(devices);

function toMap(devices: RawDeviceSpecs[]): Record<string, DeviceSpecs> {
  const map: Record<string, DeviceSpecs> = {};

  devices.forEach((device) => {
    const spec: DeviceSpecs = {
      name: device.name,
      width: device.width / device.ratio,
      height: device.height / device.ratio,
      bezels: {
        top: device.bezels.top / device.ratio,
        right: device.bezels.right / device.ratio,
        bottom: device.bezels.bottom / device.ratio,
        left: device.bezels.left / device.ratio,
      },
      frames: device.frames,
    };

    map[device.name] = spec;
    device.aliases.forEach((alias) => {
      if (!(alias in map)) {
        map[alias] = spec;
      }
    });
  });

  return map;
}
