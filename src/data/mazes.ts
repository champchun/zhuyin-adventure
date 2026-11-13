// 由 tools/gen-dungeon.mjs 產生，不要手改。要換迷宮：改 tools/gen-dungeon.mjs 裡的種子，重跑 node tools/gen-dungeon.mjs
import type { Floor } from '../../tools/gen-dungeon.mjs';

export const MAZES: Record<'gc1' | 'gc2' | 'xc1' | 'xc2' | 'zc1' | 'zc2' | 'sc1' | 'sc2', Floor> = {
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
  },
  "xc1": {
    "w": 31,
    "h": 22,
    "rows": [
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
      "S::S:::::::::::::::::S::::::::S",
      "S::S:::::::::::::::::S::S:::::S",
      "S::SSSSSSSSSSSSSSSS::SSSS::SSSS",
      "S:::::::::::::::::::::::S:::::S",
      "S:::::::::::::::::::::::S:::::S",
      "SSSSSSSSSSSSSSSS::S::S::SSSS::S",
      "S::::::::::::::S:::::::::::S::S",
      "S::::::::::::::S:::::::::::S::S",
      "S::S::SSSS::S::SSSSSSSSSS::S::S",
      "S::S::S:::::S:::::::::::S:::::S",
      "S::S::S:::::S::S::::::::S:::::S",
      "SSSS::S::SSSS::SSSS::S::S::S::S",
      "S:::::::::::S:::::S::S::S:::::S",
      "S:::::::::::S:::::S::S::S:::::S",
      "S::SSSS::SSSS::SSSS::SSSS::SSSS",
      "S::S:::::::::::S:::::S:::::S::S",
      "S::S:::::::::::S:::::S:::::S::S",
      "S::S::SSSSSSSSSS::S::S::SSSS::S",
      "S::::::::::::::S::::::::::::::S",
      "S::::::::::::::S::::::::::::::S",
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS"
    ],
    "objects": [
      {
        "role": "key",
        "x": 29,
        "y": 17
      },
      {
        "role": "up",
        "x": 1,
        "y": 1
      },
      {
        "role": "down",
        "x": 11,
        "y": 14
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
        "x": 15,
        "y": 10
      },
      {
        "role": "chest",
        "x": 17,
        "y": 14
      },
      {
        "role": "chest",
        "x": 29,
        "y": 2
      },
      {
        "role": "chest",
        "x": 23,
        "y": 14
      },
      {
        "role": "monster",
        "x": 16,
        "y": 10,
        "ai": "patrol",
        "patrol": [
          {
            "x": 17,
            "y": 10
          },
          {
            "x": 17,
            "y": 11
          }
        ]
      },
      {
        "role": "monster",
        "x": 25,
        "y": 19,
        "ai": "patrol",
        "patrol": [
          {
            "x": 26,
            "y": 19
          },
          {
            "x": 26,
            "y": 20
          }
        ]
      },
      {
        "role": "monster",
        "x": 13,
        "y": 16,
        "ai": "patrol",
        "patrol": [
          {
            "x": 14,
            "y": 16
          },
          {
            "x": 14,
            "y": 17
          }
        ]
      },
      {
        "role": "monster",
        "x": 13,
        "y": 13,
        "ai": "patrol",
        "patrol": [
          {
            "x": 14,
            "y": 13
          },
          {
            "x": 14,
            "y": 14
          }
        ]
      }
    ],
    "arrive": {
      "x": 2,
      "y": 1
    },
    "downArrive": {
      "x": 10,
      "y": 14
    }
  },
  "xc2": {
    "w": 31,
    "h": 22,
    "rows": [
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
      "S::S:::::::::::::::::S::::::::S",
      "S::S:::::::::::::::::S::S:::::S",
      "S::SSSSSSSSSSSSS::S::SSSS::S::S",
      "S::S:::::::::::S::S:::::::::::S",
      "S::S:::::::::::S::S:::::::::::S",
      "S::S::SSSSSSS::S::SSSSSSS::S::S",
      "S:::::S::::::::S::S::::::::S::S",
      "S:::::S::::::::S::S::::::::S::S",
      "SSSSSSS::S::S::S::SSSSSSS::S::S",
      "S::::::::S:::::S::::::::S::S::S",
      "S::::::::S:::::S:::::S::S::S::S",
      "S::S::SSSSSSS::SSSS::S::S::S::S",
      "S::S::S:::::::::::S::S::S::S::S",
      "S::S::S:::::::::::S::S::S::S::S",
      "S::S::S::SSSSSSS::S::S::S::S::S",
      "S::S::S:::::S:::::S::S::S::S::S",
      "S::S::S:::::S:::::S::S::S::S::S",
      "S::S::SSSS::S::SSSSSSS::S::S::S",
      "S:::::::::::S:::::::::::S:::::S",
      "S:::::::::::S:::::::::::S:::::S",
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS"
    ],
    "objects": [
      {
        "role": "switch",
        "x": 23,
        "y": 11
      },
      {
        "role": "up",
        "x": 1,
        "y": 1
      },
      {
        "role": "boss",
        "x": 19,
        "y": 7
      },
      {
        "role": "bossChest",
        "x": 20,
        "y": 8
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
        "x": 21,
        "y": 10
      },
      {
        "role": "chest",
        "x": 20,
        "y": 17
      },
      {
        "role": "chest",
        "x": 5,
        "y": 2
      },
      {
        "role": "chest",
        "x": 29,
        "y": 20
      },
      {
        "role": "monster",
        "x": 14,
        "y": 11,
        "ai": "chase"
      },
      {
        "role": "monster",
        "x": 2,
        "y": 20,
        "ai": "chase"
      },
      {
        "role": "monster",
        "x": 20,
        "y": 11,
        "ai": "chase"
      }
    ],
    "arrive": {
      "x": 2,
      "y": 1
    },
    "downArrive": null
  },
  "zc1": {
    "w": 31,
    "h": 22,
    "rows": [
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
      "S::::::::S::S::::::::S::::::::S",
      "S::::::::S::S::::::::S::S:::::S",
      "SSSSSSS::S::S::S::S::SSSS::SSSS",
      "S:::::S::S::::::::S:::::::::::S",
      "S:::::S::S::::::::S:::::::::::S",
      "S::SSSS::SSSSSSSSSS::SSSSSSS::S",
      "S:::::S::::::::::::::S::::::::S",
      "S:::::S::::::::::::::S::::::::S",
      "S::S::SSSSSSSSSS::S::S::SSSSSSS",
      "S::S::::::::S:::::S::S::::::::S",
      "S::S::::::::S:::::S::S::::::::S",
      "S::SSSSSSS::S::SSSSSSSSSS::S::S",
      "S::::::::S::S:::::::::::::::::S",
      "S::::::::S::S:::::::::::::::::S",
      "S::SSSSSSS::SSSSSSSSSSSSSSSS::S",
      "S::S:::::::::::::::::::::::S::S",
      "S::S:::::::::::::::::::::::S::S",
      "S::S::S::SSSSSSSSSSSSSSSSSSS::S",
      "S:::::::::::::::::::::::::::::S",
      "S:::::::::::S:::::::::::::::::S",
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS"
    ],
    "objects": [
      {
        "role": "key",
        "x": 29,
        "y": 2
      },
      {
        "role": "up",
        "x": 1,
        "y": 1
      },
      {
        "role": "down",
        "x": 8,
        "y": 14
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
        "x": 26,
        "y": 17
      },
      {
        "role": "chest",
        "x": 11,
        "y": 2
      },
      {
        "role": "chest",
        "x": 20,
        "y": 11
      },
      {
        "role": "monster",
        "x": 22,
        "y": 16,
        "ai": "patrol",
        "patrol": [
          {
            "x": 23,
            "y": 16
          },
          {
            "x": 23,
            "y": 17
          }
        ]
      },
      {
        "role": "monster",
        "x": 4,
        "y": 7,
        "ai": "patrol",
        "patrol": [
          {
            "x": 5,
            "y": 7
          },
          {
            "x": 5,
            "y": 8
          }
        ]
      },
      {
        "role": "monster",
        "x": 19,
        "y": 16,
        "ai": "patrol",
        "patrol": [
          {
            "x": 20,
            "y": 16
          },
          {
            "x": 20,
            "y": 17
          }
        ]
      },
      {
        "role": "monster",
        "x": 1,
        "y": 4,
        "ai": "patrol",
        "patrol": [
          {
            "x": 2,
            "y": 4
          },
          {
            "x": 2,
            "y": 5
          }
        ]
      }
    ],
    "arrive": {
      "x": 2,
      "y": 1
    },
    "downArrive": {
      "x": 7,
      "y": 14
    }
  },
  "zc2": {
    "w": 31,
    "h": 22,
    "rows": [
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
      "S::S:::::S:::::S:::::S::::::::S",
      "S::S:::::S:::::S:::::S::S:::::S",
      "S::S::S::S::S::S::S::SSSSSSS::S",
      "S:::::S::S::S:::::S:::::::::::S",
      "S:::::S::S::S:::::S:::::::::::S",
      "S::SSSS::S::S::SSSS::S::SSSS::S",
      "S:::::S::::::::::::::S::::::::S",
      "S:::::S::::::::::::::S::::::::S",
      "S::S::S::S::S::S::SSSS:SSSSSSSS",
      "S::S:::::S::::::::S::S::S:::::S",
      "S::S:::::S::::::::S::S::S:::::S",
      "S::S::SSSS::SSSSSSS::S::SSSS::S",
      "S:::::::::::S::::::::S:::::S::S",
      "S:::::::::::S::::::::S:::::S::S",
      "SSSSSSSSSSSSS::SSSSSSSSSS::S::S",
      "S:::::S::::::::S:::::S:::::S::S",
      "S:::::S::::::::S:::::S:::::S::S",
      "S::S::S::SSSS::S::S::S::S::S::S",
      "S::S::::::::S:::::::::::::::::S",
      "S::S::::::::S:::::::::::::::::S",
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS"
    ],
    "objects": [
      {
        "role": "switch",
        "x": 26,
        "y": 2
      },
      {
        "role": "up",
        "x": 1,
        "y": 1
      },
      {
        "role": "boss",
        "x": 1,
        "y": 19
      },
      {
        "role": "bossChest",
        "x": 2,
        "y": 20
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
        "x": 22,
        "y": 9
      },
      {
        "role": "chest",
        "x": 26,
        "y": 11
      },
      {
        "role": "chest",
        "x": 11,
        "y": 20
      },
      {
        "role": "chest",
        "x": 20,
        "y": 11
      },
      {
        "role": "monster",
        "x": 20,
        "y": 5,
        "ai": "chase"
      },
      {
        "role": "monster",
        "x": 11,
        "y": 17,
        "ai": "chase"
      },
      {
        "role": "monster",
        "x": 5,
        "y": 17,
        "ai": "chase"
      }
    ],
    "arrive": {
      "x": 2,
      "y": 1
    },
    "downArrive": null
  },
  "sc1": {
    "w": 31,
    "h": 22,
    "rows": [
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
      "S:::::S:::::::::::S:::::S:::::S",
      "S:::::S:::::::::::S::S::S:::::S",
      "S::S::SSSS::SSSS::S::SSSS::SSSS",
      "S::S::::::::S:::::S:::::::::::S",
      "S::S::::::::S:::::S:::::::::::S",
      "S::SSSS::SSSS::SSSS::SSSSSSS::S",
      "S:::::S::::::::S:::::S:::::S::S",
      "S:::::S::::::::S:::::S:::::S::S",
      "S::S::S::SSSSSSS::S::S::S::S::S",
      "S::S::S:::::S::S::S:::::S:::::S",
      "S::S::S:::::S::S::S:::::S:::::S",
      "S::S::SSSS::S::S::SSSS::S::S::S",
      "S::S:::::S::S:::::::::::S::S::S",
      "S::S:::::S::S:::::::::::S::S::S",
      "S::SSSS::S::SSSSSSSSSSSSS:SS::S",
      "S::S:::::S:::::S:::::::::::S::S",
      "S::S:::::S:::::S:::::::::::S::S",
      "S::SSSS::SSSS::S::SSSSSSSSSS::S",
      "S:::::::::::::::::S:::::::::::S",
      "S:::::::::::::::::S:::::::::::S",
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS"
    ],
    "objects": [
      {
        "role": "key",
        "x": 5,
        "y": 17
      },
      {
        "role": "up",
        "x": 1,
        "y": 1
      },
      {
        "role": "down",
        "x": 26,
        "y": 8
      },
      {
        "role": "rock",
        "x": 21,
        "y": 1
      },
      {
        "role": "closet",
        "x": 23,
        "y": 2
      },
      {
        "role": "door",
        "x": 25,
        "y": 15
      },
      {
        "role": "chest",
        "x": 8,
        "y": 2
      },
      {
        "role": "chest",
        "x": 20,
        "y": 20
      },
      {
        "role": "chest",
        "x": 29,
        "y": 2
      },
      {
        "role": "monster",
        "x": 28,
        "y": 19,
        "ai": "patrol",
        "patrol": [
          {
            "x": 29,
            "y": 19
          },
          {
            "x": 29,
            "y": 20
          }
        ]
      },
      {
        "role": "monster",
        "x": 13,
        "y": 19,
        "ai": "patrol",
        "patrol": [
          {
            "x": 14,
            "y": 19
          },
          {
            "x": 14,
            "y": 20
          }
        ]
      },
      {
        "role": "monster",
        "x": 16,
        "y": 1,
        "ai": "patrol",
        "patrol": [
          {
            "x": 17,
            "y": 1
          },
          {
            "x": 17,
            "y": 2
          }
        ]
      },
      {
        "role": "monster",
        "x": 28,
        "y": 16,
        "ai": "patrol",
        "patrol": [
          {
            "x": 29,
            "y": 16
          },
          {
            "x": 29,
            "y": 17
          }
        ]
      }
    ],
    "arrive": {
      "x": 2,
      "y": 1
    },
    "downArrive": {
      "x": 25,
      "y": 8
    }
  },
  "sc2": {
    "w": 31,
    "h": 22,
    "rows": [
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",
      "S::S::::::::S::S:::::S::::::::S",
      "S::S::::::::S::S:::::S::S:::::S",
      "S::SSSS::S::S::S::S::SSSSSSS::S",
      "S:::::::::::S:::::S:::::::::::S",
      "S:::::::::::S:::::S:::::::::::S",
      "SSSSSSSSSS::S::SSSSSSS::S::S::S",
      "S:::::::::::S:::::::::::S:::::S",
      "S:::::::::::S:::::::::::S:::::S",
      "S::SSSS::SSSS::SSSSSSSSSS::SSSS",
      "S::::::::S::S:::::::::::S:::::S",
      "S::::::::S::S:::::S:::::S:::::S",
      "SSSSSSS::S::S::SSSS::S::S::S::S",
      "S::::::::S:::::S::::::::S:::::S",
      "S::::::::S:::::S::::::::S:::::S",
      "S::SSSS::SSSS::S::SSSSSSS::S::S",
      "S::S::::::::S::S::S::S:::::S::S",
      "S::S::::::::S::S::S::S:::::S::S",
      "S::S::SSSS::SSSS::S::S::S::S::S",
      "S:::::S:::::::::::S:::::S:::::S",
      "S:::::S:::::::::::S:::::S:::::S",
      "SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS"
    ],
    "objects": [
      {
        "role": "switch",
        "x": 5,
        "y": 2
      },
      {
        "role": "up",
        "x": 1,
        "y": 1
      },
      {
        "role": "boss",
        "x": 19,
        "y": 16
      },
      {
        "role": "bossChest",
        "x": 20,
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
        "x": 18,
        "y": 10
      },
      {
        "role": "chest",
        "x": 11,
        "y": 11
      },
      {
        "role": "chest",
        "x": 14,
        "y": 2
      },
      {
        "role": "chest",
        "x": 14,
        "y": 17
      },
      {
        "role": "monster",
        "x": 23,
        "y": 5,
        "ai": "chase"
      },
      {
        "role": "monster",
        "x": 11,
        "y": 14,
        "ai": "chase"
      },
      {
        "role": "monster",
        "x": 26,
        "y": 14,
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
