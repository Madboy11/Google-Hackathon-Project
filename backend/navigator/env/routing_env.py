import numpy as np

class MockSpace:
    def __init__(self, n=None, low=None, high=None, shape=None, dtype=None):
        self.n = n
        self.shape = shape

# A simplified mock of gym.Env
class RoutingEnv:
    """
    State:  vessel coords + port congestion + weather score + geopolitical risk
    Action: [0=maintain, 1=speed_up, 2=slow_down, 3=divert_port_A, 4=divert_port_B, 5=modal_switch]
    Reward: penalise late_delivery + carbon_emissions + demurrage_cost
    """
    def __init__(self, risk_feed=None):
        try:
            import gymnasium as gym
            self.observation_space = gym.spaces.Box(low=0, high=1, shape=(12,), dtype=np.float32)
            self.action_space = gym.spaces.Discrete(6)
        except ImportError:
            # Fallback mock spaces so it runs without Gym
            self.observation_space = MockSpace(low=0, high=1, shape=(12,), dtype=np.float32)
            self.action_space = MockSpace(n=6)
        
        self.risk_feed = risk_feed

    def reset(self, seed=None, options=None):
        return np.zeros(12, dtype=np.float32), {}

    def step(self, action):
        reward = 0.0
        done = False
        truncated = False
        info = {}
        return np.zeros(12, dtype=np.float32), reward, done, truncated, info
