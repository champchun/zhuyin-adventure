// 由 tools/gen-dungeon.mjs 產生，不要手改。要換迷宮：改 tools/gen-dungeon.mjs 裡的種子，重跑 node tools/gen-dungeon.mjs
import type { Floor } from '../../tools/gen-dungeon.mjs';

export const MAZES: Record<'gc1' | 'gc2', Floor> = {
  "gc1": {
    "w": 31,
    "h": 22,
    "rows": [
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
      "S:::::::::::S::::::::S::::::::S",
      "S:::::::::::S::::::::S::S:::::S",
      "SSSSSSSSSS::SSSSSSS::SSSS::S::S",
      "S::::::::S::::::::::::::S:::::S",
      "S::::::::S::::::::::::::S:::::S",
      "S::SSSS::S::S::SSSSSSS::S::S::S",
      "S::::::::S:::::S::::::::S::S::S",
      "S::::::::S:::::S::::::::S::S::S",
      "S::SSSSSSSSSSSSS::SSSSSSS::S::S",
      "S:::::::::::::::::S::::::::S::S",
      "S:::::::::::::::::S::::::::S::S",
      "S::SSSSSSS::SSSS::S::S::S::S::S",
      "S::S:::::S::::::::S::S::S:::::S",
      "S::S:::::S::::::::S::S::S:::::S",
      "S::SSSS::SSSSSSSSSSSSS::S::S::S",
      "S:::::S:::::S:::::::::::S::S::S",
      "S:::::S:::::S:::::::::::S::S::S",
      "SSSS::S::S::SSSS::SSSSSSS::S::S",
      "S::::::::S::::::::S:::::::::::S",
      "S::::::::S::S:::::S:::::::::::S",
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS"
    ],
    "objects": [
      {
        "role": "key",
        "x": 5,
        "y": 14
      },
      {
        "role": "up",
        "x": 1,
        "y": 1
      },
      {
        "role": "down",
        "x": 29,
        "y": 2
      },
      {
        "role": "rock",
        "x": 24,
        "y": 1
      },
      {
        "role": "closet",
        "x": 23,
        "y": 2
      },
      {
        "role": "door",
        "x": 12,
        "y": 19
      },
      {
        "role": "chest",
        "x": 20,
        "y": 20
      },
      {
        "role": "chest",
        "x": 20,
        "y": 14
      },
      {
        "role": "chest",
        "x": 14,
        "y": 17
      },
      {
        "role": "monster",
        "x": 19,
        "y": 1,
        "ai": "patrol",
        "patrol": [
          {
            "x": 20,
            "y": 1
          },
          {
            "x": 20,
            "y": 2
          }
        ]
      },
      {
        "role": "monster",
        "x": 10,
        "y": 19,
        "ai": "patrol",
        "patrol": [
          {
            "x": 11,
            "y": 19
          },
          {
            "x": 11,
            "y": 20
          }
        ]
      },
      {
        "role": "monster",
        "x": 22,
        "y": 4,
        "ai": "patrol",
        "patrol": [
          {
            "x": 23,
            "y": 4
          },
          {
            "x": 23,
            "y": 5
          }
        ]
      },
      {
        "role": "monster",
        "x": 16,
        "y": 7,
        "ai": "patrol",
        "patrol": [
          {
            "x": 17,
            "y": 7
          },
          {
            "x": 17,
            "y": 8
          }
        ]
      }
    ],
    "arrive": {
      "x": 2,
      "y": 1
    },
    "downArrive": {
      "x": 28,
      "y": 2
    }
  },
  "gc2": {
    "w": 31,
    "h": 22,
    "rows": [
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
      "S:::::S::::::::::::::S::::::::S",
      "S:::::S::::::::::::::S::S:::::S",
      "SSSS::SSSSSSSSSSSSS::SSSS::S::S",
      "S:::::S:::::S::::::::::::::S::S",
      "S:::::S:::::S::::::::::::::S::S",
      "S::SSSS::S::S::SSSSSSS::SSSS::S",
      "S::S:::::S:::::S:::::S::::::::S",
      "S::S:::::S:::::S:::::S::::::::S",
      "S::S::SSSSSSSSSSSSS::SSSSSSS::S",
      "S:::::S:::::::::::S:::::S:::::S",
      "S:::::S:::::::::::S:::::S:::::S",
      "SSSSSSS::S::SSSS::S::S::S::SSSS",
      "S::::::::::::::::::::S::S::S::S",
      "S::::::::::::::::::::S::S::S::S",
      "S::S::SSSSSSS::SSSSSSS::S::S::S",
      "S::::::::S::::::::::::::S::S::S",
      "S::::::::S::::::::::::::S::S::S",
      "SSSS::S::S::SSSS::S:SSSSS::S::S",
      "S::::::::S::::::::S:::::::::::S",
      "S::::::::S::::::::S:::::::::::S",
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS"
    ],
    "objects": [
      {
        "role": "switch",
        "x": 29,
        "y": 14
      },
      {
        "role": "up",
        "x": 1,
        "y": 1
      },
      {
        "role": "boss",
        "x": 7,
        "y": 16
      },
      {
        "role": "bossChest",
        "x": 8,
        "y": 17
      },
      {
        "role": "rock",
        "x": 24,
        "y": 1
      },
      {
        "role": "closet",
        "x": 23,
        "y": 2
      },
      {
        "role": "barrier",
        "x": 19,
        "y": 18
      },
      {
        "role": "chest",
        "x": 8,
        "y": 2
      },
      {
        "role": "chest",
        "x": 2,
        "y": 20
      },
      {
        "role": "chest",
        "x": 17,
        "y": 8
      },
      {
        "role": "monster",
        "x": 23,
        "y": 17,
        "ai": "chase"
      },
      {
        "role": "monster",
        "x": 23,
        "y": 14,
        "ai": "chase"
      },
      {
        "role": "monster",
        "x": 14,
        "y": 8,
        "ai": "chase"
      }
    ],
    "arrive": {
      "x": 2,
      "y": 1
    },
    "downArrive": null
  }
};
